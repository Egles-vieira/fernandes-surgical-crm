-- ============================================
-- Dashboard Agente IA V4 - Materialized Views
-- ============================================

-- MV 1: Resumo geral do agente (KPIs principais)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agente_ia_resumo AS
SELECT 
  COUNT(DISTINCT s.id) as total_sessoes,
  COUNT(DISTINCT s.id) FILTER (WHERE s.expira_em > NOW()) as sessoes_ativas,
  COUNT(DISTINCT s.oportunidade_spot_id) FILTER (WHERE s.oportunidade_spot_id IS NOT NULL) as oportunidades_criadas,
  COALESCE(SUM(l.tokens_entrada), 0) as total_tokens_entrada,
  COALESCE(SUM(l.tokens_saida), 0) as total_tokens_saida,
  COALESCE(AVG(l.tempo_execucao_ms) FILTER (WHERE l.tool_name IS NOT NULL), 0) as tempo_medio_tools_ms,
  COUNT(l.id) FILTER (WHERE l.erro_mensagem IS NOT NULL) as total_erros,
  COUNT(DISTINCT l.id) FILTER (WHERE l.tool_name IS NOT NULL) as total_tools_executadas,
  NOW() as ultima_atualizacao
FROM whatsapp_agente_sessoes s
LEFT JOIN whatsapp_agente_logs l ON l.sessao_id = s.id
WHERE s.criado_em >= NOW() - INTERVAL '30 days';

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agente_ia_resumo_pk ON mv_agente_ia_resumo (ultima_atualizacao);

-- MV 2: Sessões por estado do funil
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agente_sessoes_por_estado AS
SELECT 
  estado_atual,
  COUNT(*) as quantidade,
  COALESCE(AVG(total_mensagens), 0) as media_mensagens,
  COALESCE(AVG(total_tools_executadas), 0) as media_tools,
  MIN(criado_em) as primeira_sessao,
  MAX(criado_em) as ultima_sessao
FROM whatsapp_agente_sessoes
WHERE criado_em >= NOW() - INTERVAL '30 days'
GROUP BY estado_atual;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agente_sessoes_estado_pk ON mv_agente_sessoes_por_estado (estado_atual);

-- MV 3: Performance de cada tool
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agente_tools_performance AS
SELECT 
  tool_name,
  COUNT(*) as total_chamadas,
  COALESCE(AVG(tempo_execucao_ms), 0) as tempo_medio_ms,
  COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tempo_execucao_ms), 0) as p95_ms,
  COALESCE(MAX(tempo_execucao_ms), 0) as max_ms,
  COUNT(*) FILTER (WHERE l.erro_mensagem IS NOT NULL) as total_erros,
  ROUND(COUNT(*) FILTER (WHERE l.erro_mensagem IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as taxa_erro_percent
FROM whatsapp_agente_logs l
WHERE tool_name IS NOT NULL
  AND criado_em >= NOW() - INTERVAL '30 days'
GROUP BY tool_name
ORDER BY total_chamadas DESC;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agente_tools_perf_pk ON mv_agente_tools_performance (tool_name);

-- MV 4: Métricas por dia para gráfico de evolução
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agente_por_dia AS
SELECT 
  DATE(s.criado_em) as data,
  COUNT(DISTINCT s.id) as sessoes,
  COUNT(DISTINCT s.oportunidade_spot_id) FILTER (WHERE s.oportunidade_spot_id IS NOT NULL) as oportunidades,
  COALESCE(SUM(l.tokens_entrada), 0) + COALESCE(SUM(l.tokens_saida), 0) as tokens_total,
  COUNT(DISTINCT l.id) FILTER (WHERE l.tool_name IS NOT NULL) as tools_executadas,
  COUNT(l.id) FILTER (WHERE l.erro_mensagem IS NOT NULL) as erros
FROM whatsapp_agente_sessoes s
LEFT JOIN whatsapp_agente_logs l ON l.sessao_id = s.id
WHERE s.criado_em >= NOW() - INTERVAL '30 days'
GROUP BY DATE(s.criado_em)
ORDER BY data DESC;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agente_por_dia_pk ON mv_agente_por_dia (data);

-- MV 5: Uso de providers LLM (usando tipo_evento)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agente_providers_uso AS
SELECT 
  COALESCE(llm_provider, 'unknown') as provider,
  COUNT(*) as total_chamadas,
  COALESCE(SUM(tokens_entrada), 0) as tokens_entrada,
  COALESCE(SUM(tokens_saida), 0) as tokens_saida,
  COALESCE(AVG(tempo_execucao_ms), 0) as tempo_medio_ms
FROM whatsapp_agente_logs
WHERE tipo_evento = 'llm_call'
  AND criado_em >= NOW() - INTERVAL '30 days'
GROUP BY llm_provider;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agente_providers_pk ON mv_agente_providers_uso (provider);

-- Função para refresh de todas as MVs do agente
CREATE OR REPLACE FUNCTION refresh_mv_agente_ia()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agente_ia_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agente_sessoes_por_estado;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agente_tools_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agente_por_dia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agente_providers_uso;
END;
$$;

-- Refresh inicial das MVs
SELECT refresh_mv_agente_ia();