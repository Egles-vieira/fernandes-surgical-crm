-- ============================================================
-- Materialized Views para Dashboard de Pipelines
-- ============================================================

-- MV 1: KPIs gerais consolidados de todos os pipelines
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pipelines_kpis AS
SELECT 
  COUNT(DISTINCT p.id) as total_pipelines,
  COUNT(o.id) as total_oportunidades,
  COUNT(CASE WHEN o.esta_fechada = false THEN 1 END) as oportunidades_abertas,
  COUNT(CASE WHEN o.foi_ganha = true THEN 1 END) as oportunidades_ganhas,
  COUNT(CASE WHEN o.esta_fechada = true AND o.foi_ganha = false THEN 1 END) as oportunidades_perdidas,
  COALESCE(SUM(o.valor), 0)::numeric as valor_total_pipeline,
  COALESCE(SUM(CASE WHEN o.esta_fechada = false THEN o.valor END), 0)::numeric as valor_em_aberto,
  COALESCE(SUM(CASE WHEN o.foi_ganha = true THEN o.valor END), 0)::numeric as valor_ganho,
  COALESCE(SUM(CASE WHEN o.esta_fechada = false THEN o.valor * o.percentual_probabilidade / 100 END), 0)::numeric as valor_ponderado,
  CASE 
    WHEN COUNT(CASE WHEN o.esta_fechada THEN 1 END) > 0 
    THEN ROUND((COUNT(CASE WHEN o.foi_ganha THEN 1 END)::decimal / COUNT(CASE WHEN o.esta_fechada THEN 1 END) * 100), 1)
    ELSE 0 
  END as taxa_conversao,
  COALESCE(AVG(o.valor) FILTER (WHERE o.valor > 0), 0)::numeric as ticket_medio,
  NOW() as atualizado_em
FROM pipelines p
LEFT JOIN oportunidades o ON o.pipeline_id = p.id AND o.excluido_em IS NULL
WHERE p.esta_ativo = true;

-- MV 2: Métricas por pipeline individual (para os cards)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_metricas_por_pipeline AS
SELECT 
  p.id as pipeline_id,
  p.nome,
  p.cor,
  p.icone,
  p.tipo_pipeline,
  p.ordem_exibicao,
  COUNT(o.id)::integer as total_oportunidades,
  COUNT(CASE WHEN o.esta_fechada = false THEN 1 END)::integer as abertas,
  COUNT(CASE WHEN o.foi_ganha = true THEN 1 END)::integer as ganhas,
  COUNT(CASE WHEN o.esta_fechada = true AND o.foi_ganha = false THEN 1 END)::integer as perdidas,
  COALESCE(SUM(o.valor), 0)::numeric as valor_total,
  COALESCE(SUM(CASE WHEN o.esta_fechada = false THEN o.valor END), 0)::numeric as valor_aberto,
  COALESCE(SUM(CASE WHEN o.foi_ganha THEN o.valor END), 0)::numeric as valor_ganho,
  COALESCE(SUM(CASE WHEN o.esta_fechada = false THEN o.valor * o.percentual_probabilidade / 100 END), 0)::numeric as valor_ponderado,
  CASE 
    WHEN COUNT(CASE WHEN o.esta_fechada THEN 1 END) > 0 
    THEN ROUND((COUNT(CASE WHEN o.foi_ganha THEN 1 END)::decimal / COUNT(CASE WHEN o.esta_fechada THEN 1 END) * 100), 1)
    ELSE 0 
  END as taxa_conversao
FROM pipelines p
LEFT JOIN oportunidades o ON o.pipeline_id = p.id AND o.excluido_em IS NULL
WHERE p.esta_ativo = true
GROUP BY p.id
ORDER BY p.ordem_exibicao;

-- MV 3: Métricas por estágio (para funil detalhado)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_metricas_por_estagio AS
SELECT 
  ep.id as estagio_id,
  ep.nome_estagio,
  ep.cor,
  ep.ordem_estagio,
  ep.percentual_probabilidade,
  p.id as pipeline_id,
  p.nome as pipeline_nome,
  p.cor as pipeline_cor,
  COUNT(o.id)::integer as total_oportunidades,
  COALESCE(SUM(o.valor), 0)::numeric as valor_total,
  COALESCE(SUM(o.valor * o.percentual_probabilidade / 100), 0)::numeric as valor_ponderado,
  COALESCE(AVG(o.dias_no_estagio), 0)::integer as media_dias_estagio
FROM estagios_pipeline ep
JOIN pipelines p ON p.id = ep.pipeline_id
LEFT JOIN oportunidades o ON o.estagio_id = ep.id AND o.excluido_em IS NULL AND o.esta_fechada = false
WHERE p.esta_ativo = true
GROUP BY ep.id, p.id
ORDER BY p.ordem_exibicao, ep.ordem_estagio;

-- MV 4: Evolução mensal por pipeline (últimos 6 meses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_evolucao_mensal_pipeline AS
SELECT 
  p.id as pipeline_id,
  p.nome as pipeline_nome,
  p.cor,
  TO_CHAR(o.criado_em, 'YYYY-MM') as mes,
  TO_CHAR(o.criado_em, 'Mon') as mes_abrev,
  EXTRACT(YEAR FROM o.criado_em)::int * 100 + EXTRACT(MONTH FROM o.criado_em)::int as ordem_mes,
  COUNT(o.id)::integer as novas_oportunidades,
  COUNT(CASE WHEN o.foi_ganha THEN 1 END)::integer as ganhas,
  COALESCE(SUM(o.valor), 0)::numeric as valor_criado,
  COALESCE(SUM(CASE WHEN o.foi_ganha THEN o.valor END), 0)::numeric as valor_ganho
FROM pipelines p
INNER JOIN oportunidades o ON o.pipeline_id = p.id AND o.excluido_em IS NULL
WHERE p.esta_ativo = true 
  AND o.criado_em >= NOW() - INTERVAL '6 months'
GROUP BY p.id, p.nome, p.cor, TO_CHAR(o.criado_em, 'YYYY-MM'), TO_CHAR(o.criado_em, 'Mon'), ordem_mes
ORDER BY p.ordem_exibicao, ordem_mes;

-- Índices únicos para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pipelines_kpis_unique ON mv_pipelines_kpis (total_pipelines, total_oportunidades, atualizado_em);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_metricas_por_pipeline_unique ON mv_metricas_por_pipeline (pipeline_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_metricas_por_estagio_unique ON mv_metricas_por_estagio (estagio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_evolucao_mensal_pipeline_unique ON mv_evolucao_mensal_pipeline (pipeline_id, mes);

-- Função para refresh de todas as MVs de pipelines
CREATE OR REPLACE FUNCTION refresh_mv_pipelines()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_pipelines_kpis;
  REFRESH MATERIALIZED VIEW mv_metricas_por_pipeline;
  REFRESH MATERIALIZED VIEW mv_metricas_por_estagio;
  REFRESH MATERIALIZED VIEW mv_evolucao_mensal_pipeline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Popular as MVs imediatamente
SELECT refresh_mv_pipelines();