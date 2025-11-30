-- ============================================
-- MATERIALIZED VIEWS PARA DASHBOARD PANELS
-- Otimização para 300 usuários concorrentes
-- ============================================

-- 1. MV_CLIENTES_RESUMO - KPIs de Clientes
DROP MATERIALIZED VIEW IF EXISTS mv_clientes_resumo CASCADE;
CREATE MATERIALIZED VIEW mv_clientes_resumo AS
SELECT
  COUNT(*) AS total_clientes,
  COUNT(*) FILTER (WHERE natureza::text = 'Juridica') AS clientes_pj,
  COUNT(*) FILTER (WHERE natureza::text = 'Fisica') AS clientes_pf,
  COALESCE(SUM(lim_credito), 0) AS limite_total,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS novos_mes,
  (SELECT COUNT(*) FROM contatos) AS total_contatos,
  NOW() AS atualizado_em
FROM clientes;

CREATE UNIQUE INDEX idx_mv_clientes_resumo ON mv_clientes_resumo (atualizado_em);

-- 2. MV_CLIENTES_POR_NATUREZA
DROP MATERIALIZED VIEW IF EXISTS mv_clientes_por_natureza CASCADE;
CREATE MATERIALIZED VIEW mv_clientes_por_natureza AS
SELECT 
  CASE 
    WHEN natureza::text = 'Juridica' THEN 'Pessoa Jurídica'
    WHEN natureza::text = 'Fisica' THEN 'Pessoa Física'
    ELSE 'Outros'
  END AS natureza,
  COUNT(*) AS quantidade
FROM clientes
GROUP BY 
  CASE 
    WHEN natureza::text = 'Juridica' THEN 'Pessoa Jurídica'
    WHEN natureza::text = 'Fisica' THEN 'Pessoa Física'
    ELSE 'Outros'
  END;

CREATE UNIQUE INDEX idx_mv_clientes_por_natureza ON mv_clientes_por_natureza (natureza);

-- 3. MV_CLIENTES_POR_MES - Últimos 6 meses
DROP MATERIALIZED VIEW IF EXISTS mv_clientes_por_mes CASCADE;
CREATE MATERIALIZED VIEW mv_clientes_por_mes AS
SELECT 
  to_char(mes, 'Mon') AS mes,
  EXTRACT(YEAR FROM mes) * 100 + EXTRACT(MONTH FROM mes) AS ordem_mes,
  COALESCE(c.quantidade, 0) AS quantidade
FROM generate_series(
  date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
  date_trunc('month', CURRENT_DATE),
  INTERVAL '1 month'
) AS mes
LEFT JOIN (
  SELECT 
    date_trunc('month', created_at) AS mes_criacao,
    COUNT(*) AS quantidade
  FROM clientes
  WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '5 months')
  GROUP BY date_trunc('month', created_at)
) c ON mes = c.mes_criacao
ORDER BY mes;

CREATE UNIQUE INDEX idx_mv_clientes_por_mes ON mv_clientes_por_mes (ordem_mes);

-- 4. MV_CLIENTES_POR_ESTADO - Top 5
DROP MATERIALIZED VIEW IF EXISTS mv_clientes_por_estado CASCADE;
CREATE MATERIALIZED VIEW mv_clientes_por_estado AS
SELECT 
  COALESCE(estado, 'Não informado') AS estado,
  COUNT(*) AS quantidade
FROM cliente_enderecos
GROUP BY COALESCE(estado, 'Não informado')
ORDER BY quantidade DESC
LIMIT 5;

CREATE UNIQUE INDEX idx_mv_clientes_por_estado ON mv_clientes_por_estado (estado);

-- 5. MV_PLATAFORMAS_RESUMO - KPIs de Plataformas EDI
DROP MATERIALIZED VIEW IF EXISTS mv_plataformas_resumo CASCADE;
CREATE MATERIALIZED VIEW mv_plataformas_resumo AS
SELECT
  COUNT(*) AS total_cotacoes,
  COUNT(*) FILTER (WHERE step_atual NOT IN ('respondida', 'finalizada')) AS cotacoes_pendentes,
  COUNT(*) FILTER (WHERE step_atual IN ('respondida', 'finalizada')) AS cotacoes_respondidas,
  COALESCE(SUM(valor_total_respondido), 0) AS valor_total,
  (SELECT COUNT(*) FROM edi_cotacoes_itens) AS total_itens,
  (SELECT COUNT(*) FROM plataformas_edi WHERE ativo = true) AS total_plataformas,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE step_atual IN ('respondida', 'finalizada'))::numeric / COUNT(*)::numeric) * 100)
    ELSE 0 
  END AS taxa_resposta,
  NOW() AS atualizado_em
FROM edi_cotacoes;

CREATE UNIQUE INDEX idx_mv_plataformas_resumo ON mv_plataformas_resumo (atualizado_em);

-- 6. MV_COTACOES_POR_STATUS
DROP MATERIALIZED VIEW IF EXISTS mv_cotacoes_por_status CASCADE;
CREATE MATERIALIZED VIEW mv_cotacoes_por_status AS
SELECT 
  CASE step_atual
    WHEN 'nova' THEN 'Nova'
    WHEN 'em_analise' THEN 'Em Análise'
    WHEN 'analisada' THEN 'Analisada'
    WHEN 'respondida' THEN 'Respondida'
    WHEN 'finalizada' THEN 'Finalizada'
    ELSE 'Nova'
  END AS status,
  COUNT(*) AS quantidade
FROM edi_cotacoes
GROUP BY 
  CASE step_atual
    WHEN 'nova' THEN 'Nova'
    WHEN 'em_analise' THEN 'Em Análise'
    WHEN 'analisada' THEN 'Analisada'
    WHEN 'respondida' THEN 'Respondida'
    WHEN 'finalizada' THEN 'Finalizada'
    ELSE 'Nova'
  END;

CREATE UNIQUE INDEX idx_mv_cotacoes_por_status ON mv_cotacoes_por_status (status);

-- 7. MV_WHATSAPP_RESUMO - KPIs de WhatsApp
DROP MATERIALIZED VIEW IF EXISTS mv_whatsapp_resumo CASCADE;
CREATE MATERIALIZED VIEW mv_whatsapp_resumo AS
SELECT
  (SELECT COUNT(*) FROM whatsapp_conversas) AS total_conversas,
  (SELECT COUNT(*) FROM whatsapp_conversas WHERE status = 'ativa') AS conversas_ativas,
  (SELECT COUNT(*) FROM whatsapp_mensagens) AS total_mensagens,
  (SELECT COUNT(*) FROM whatsapp_mensagens WHERE enviada_por_bot = true) AS mensagens_bot,
  (SELECT COUNT(*) FROM whatsapp_propostas_comerciais) AS total_propostas,
  (SELECT COUNT(*) FROM whatsapp_propostas_comerciais WHERE status = 'aceita') AS propostas_aceitas,
  (SELECT COALESCE(SUM(valor_total), 0) FROM whatsapp_propostas_comerciais) AS valor_propostas,
  (SELECT COUNT(*) FROM whatsapp_contas WHERE status = 'conectado') AS contas_ativas,
  CASE 
    WHEN (SELECT COUNT(*) FROM whatsapp_propostas_comerciais) > 0 THEN 
      ROUND(((SELECT COUNT(*) FROM whatsapp_propostas_comerciais WHERE status = 'aceita')::numeric / 
             (SELECT COUNT(*) FROM whatsapp_propostas_comerciais)::numeric) * 100)
    ELSE 0 
  END AS taxa_conversao,
  NOW() AS atualizado_em;

CREATE UNIQUE INDEX idx_mv_whatsapp_resumo ON mv_whatsapp_resumo (atualizado_em);

-- 8. MV_CONVERSAS_POR_STATUS
DROP MATERIALIZED VIEW IF EXISTS mv_conversas_por_status CASCADE;
CREATE MATERIALIZED VIEW mv_conversas_por_status AS
SELECT 
  CASE status
    WHEN 'ativa' THEN 'Ativa'
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'finalizada' THEN 'Finalizada'
    ELSE 'Ativa'
  END AS status,
  COUNT(*) AS quantidade
FROM whatsapp_conversas
GROUP BY 
  CASE status
    WHEN 'ativa' THEN 'Ativa'
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'finalizada' THEN 'Finalizada'
    ELSE 'Ativa'
  END;

CREATE UNIQUE INDEX idx_mv_conversas_por_status ON mv_conversas_por_status (status);

-- 9. MV_PROPOSTAS_POR_STATUS
DROP MATERIALIZED VIEW IF EXISTS mv_propostas_por_status CASCADE;
CREATE MATERIALIZED VIEW mv_propostas_por_status AS
SELECT 
  CASE status::text
    WHEN 'rascunho' THEN 'Rascunho'
    WHEN 'enviada' THEN 'Enviada'
    WHEN 'aceita' THEN 'Aceita'
    WHEN 'rejeitada' THEN 'Rejeitada'
    WHEN 'negociacao' THEN 'Negociação'
    ELSE 'Rascunho'
  END AS status,
  COUNT(*) AS quantidade
FROM whatsapp_propostas_comerciais
GROUP BY 
  CASE status::text
    WHEN 'rascunho' THEN 'Rascunho'
    WHEN 'enviada' THEN 'Enviada'
    WHEN 'aceita' THEN 'Aceita'
    WHEN 'rejeitada' THEN 'Rejeitada'
    WHEN 'negociacao' THEN 'Negociação'
    ELSE 'Rascunho'
  END;

CREATE UNIQUE INDEX idx_mv_propostas_por_status ON mv_propostas_por_status (status);

-- 10. MV_VENDAS_RESUMO - KPIs de Vendas
DROP MATERIALIZED VIEW IF EXISTS mv_vendas_resumo CASCADE;
CREATE MATERIALIZED VIEW mv_vendas_resumo AS
SELECT
  COUNT(*) AS total_vendas,
  COALESCE(SUM(COALESCE(valor_total, valor_estimado, 0)), 0) AS valor_total,
  COALESCE(SUM(COALESCE(valor_total, valor_estimado, 0)) FILTER (
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
  ), 0) AS valor_mes,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      COALESCE(SUM(COALESCE(valor_total, valor_estimado, 0)), 0) / COUNT(*)
    ELSE 0 
  END AS ticket_medio,
  COUNT(*) FILTER (WHERE etapa_pipeline = 'fechamento') AS vendas_ganhas,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE etapa_pipeline = 'fechamento')::numeric / COUNT(*)::numeric) * 100)
    ELSE 0 
  END AS taxa_conversao,
  NOW() AS atualizado_em
FROM vendas;

CREATE UNIQUE INDEX idx_mv_vendas_resumo ON mv_vendas_resumo (atualizado_em);

-- 11. MV_VENDAS_POR_ETAPA
DROP MATERIALIZED VIEW IF EXISTS mv_vendas_por_etapa CASCADE;
CREATE MATERIALIZED VIEW mv_vendas_por_etapa AS
SELECT 
  CASE etapa_pipeline
    WHEN 'prospeccao' THEN 'Prospecção'
    WHEN 'qualificacao' THEN 'Qualificação'
    WHEN 'proposta' THEN 'Proposta'
    WHEN 'negociacao' THEN 'Negociação'
    WHEN 'followup_cliente' THEN 'Follow-up'
    WHEN 'fechamento' THEN 'Fechamento'
    ELSE 'Prospecção'
  END AS etapa,
  COUNT(*) AS quantidade,
  COALESCE(SUM(COALESCE(valor_total, valor_estimado, 0)), 0) AS valor
FROM vendas
GROUP BY 
  CASE etapa_pipeline
    WHEN 'prospeccao' THEN 'Prospecção'
    WHEN 'qualificacao' THEN 'Qualificação'
    WHEN 'proposta' THEN 'Proposta'
    WHEN 'negociacao' THEN 'Negociação'
    WHEN 'followup_cliente' THEN 'Follow-up'
    WHEN 'fechamento' THEN 'Fechamento'
    ELSE 'Prospecção'
  END;

CREATE UNIQUE INDEX idx_mv_vendas_por_etapa ON mv_vendas_por_etapa (etapa);

-- 12. MV_PRODUTOS_RESUMO - KPIs de Produtos
DROP MATERIALIZED VIEW IF EXISTS mv_produtos_resumo CASCADE;
CREATE MATERIALIZED VIEW mv_produtos_resumo AS
SELECT
  COUNT(*) AS total_produtos,
  COUNT(*) AS produtos_ativos,
  COUNT(*) FILTER (WHERE COALESCE(quantidade_em_maos, 0) > 0) AS com_estoque,
  COUNT(*) FILTER (WHERE COALESCE(quantidade_em_maos, 0) <= 0) AS sem_estoque,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
  COALESCE(SUM(COALESCE(quantidade_em_maos, 0) * COALESCE(preco_venda, 0)), 0) AS valor_estoque,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE embedding IS NOT NULL)::numeric / COUNT(*)::numeric) * 100)
    ELSE 0 
  END AS taxa_embedding,
  NOW() AS atualizado_em
FROM produtos;

CREATE UNIQUE INDEX idx_mv_produtos_resumo ON mv_produtos_resumo (atualizado_em);

-- 13. MV_PRODUTOS_POR_ESTOQUE
DROP MATERIALIZED VIEW IF EXISTS mv_produtos_por_estoque CASCADE;
CREATE MATERIALIZED VIEW mv_produtos_por_estoque AS
SELECT 
  status,
  quantidade
FROM (
  SELECT 'Sem Estoque' AS status, COUNT(*) AS quantidade, 1 AS ordem
  FROM produtos WHERE COALESCE(quantidade_em_maos, 0) <= 0
  UNION ALL
  SELECT 'Baixo (<10)', COUNT(*), 2
  FROM produtos WHERE quantidade_em_maos > 0 AND quantidade_em_maos < 10
  UNION ALL
  SELECT 'Normal (10-100)', COUNT(*), 3
  FROM produtos WHERE quantidade_em_maos >= 10 AND quantidade_em_maos < 100
  UNION ALL
  SELECT 'Alto (>100)', COUNT(*), 4
  FROM produtos WHERE quantidade_em_maos >= 100
) sub
ORDER BY ordem;

CREATE UNIQUE INDEX idx_mv_produtos_por_estoque ON mv_produtos_por_estoque (status);

-- 14. MV_TICKETS_RESUMO - KPIs de Services/Tickets (usando valores reais do enum)
DROP MATERIALIZED VIEW IF EXISTS mv_tickets_resumo CASCADE;
CREATE MATERIALIZED VIEW mv_tickets_resumo AS
SELECT
  COUNT(*) AS total_tickets,
  COUNT(*) FILTER (WHERE status::text = 'aberto') AS tickets_abertos,
  0::bigint AS tickets_em_andamento,
  COUNT(*) FILTER (WHERE status::text IN ('resolvido', 'fechado')) AS tickets_resolvidos,
  COUNT(*) FILTER (WHERE prioridade::text IN ('urgente', 'alta')) AS tickets_urgentes,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE status::text IN ('resolvido', 'fechado'))::numeric / COUNT(*)::numeric) * 100)
    ELSE 0 
  END AS taxa_resolucao,
  NOW() AS atualizado_em
FROM tickets;

CREATE UNIQUE INDEX idx_mv_tickets_resumo ON mv_tickets_resumo (atualizado_em);

-- 15. MV_TICKETS_POR_STATUS (usando valores reais)
DROP MATERIALIZED VIEW IF EXISTS mv_tickets_por_status CASCADE;
CREATE MATERIALIZED VIEW mv_tickets_por_status AS
SELECT 
  CASE status::text
    WHEN 'aberto' THEN 'Aberto'
    WHEN 'resolvido' THEN 'Resolvido'
    WHEN 'fechado' THEN 'Fechado'
    ELSE 'Aberto'
  END AS status,
  COUNT(*) AS quantidade
FROM tickets
GROUP BY 
  CASE status::text
    WHEN 'aberto' THEN 'Aberto'
    WHEN 'resolvido' THEN 'Resolvido'
    WHEN 'fechado' THEN 'Fechado'
    ELSE 'Aberto'
  END;

CREATE UNIQUE INDEX idx_mv_tickets_por_status ON mv_tickets_por_status (status);

-- 16. MV_TICKETS_POR_PRIORIDADE
DROP MATERIALIZED VIEW IF EXISTS mv_tickets_por_prioridade CASCADE;
CREATE MATERIALIZED VIEW mv_tickets_por_prioridade AS
SELECT 
  CASE prioridade::text
    WHEN 'baixa' THEN 'Baixa'
    WHEN 'media' THEN 'Média'
    WHEN 'alta' THEN 'Alta'
    WHEN 'urgente' THEN 'Urgente'
    ELSE 'Média'
  END AS prioridade,
  COUNT(*) AS quantidade
FROM tickets
GROUP BY 
  CASE prioridade::text
    WHEN 'baixa' THEN 'Baixa'
    WHEN 'media' THEN 'Média'
    WHEN 'alta' THEN 'Alta'
    WHEN 'urgente' THEN 'Urgente'
    ELSE 'Média'
  END;

CREATE UNIQUE INDEX idx_mv_tickets_por_prioridade ON mv_tickets_por_prioridade (prioridade);

-- ============================================
-- PERMISSÕES
-- ============================================
GRANT SELECT ON mv_clientes_resumo TO anon, authenticated;
GRANT SELECT ON mv_clientes_por_natureza TO anon, authenticated;
GRANT SELECT ON mv_clientes_por_mes TO anon, authenticated;
GRANT SELECT ON mv_clientes_por_estado TO anon, authenticated;
GRANT SELECT ON mv_plataformas_resumo TO anon, authenticated;
GRANT SELECT ON mv_cotacoes_por_status TO anon, authenticated;
GRANT SELECT ON mv_whatsapp_resumo TO anon, authenticated;
GRANT SELECT ON mv_conversas_por_status TO anon, authenticated;
GRANT SELECT ON mv_propostas_por_status TO anon, authenticated;
GRANT SELECT ON mv_vendas_resumo TO anon, authenticated;
GRANT SELECT ON mv_vendas_por_etapa TO anon, authenticated;
GRANT SELECT ON mv_produtos_resumo TO anon, authenticated;
GRANT SELECT ON mv_produtos_por_estoque TO anon, authenticated;
GRANT SELECT ON mv_tickets_resumo TO anon, authenticated;
GRANT SELECT ON mv_tickets_por_status TO anon, authenticated;
GRANT SELECT ON mv_tickets_por_prioridade TO anon, authenticated;

-- ============================================
-- FUNÇÃO PARA REFRESH DE TODAS AS MVs
-- ============================================
CREATE OR REPLACE FUNCTION refresh_all_dashboard_mvs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_por_natureza;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_por_mes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_por_estado;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_plataformas_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cotacoes_por_status;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_whatsapp_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversas_por_status;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_propostas_por_status;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_por_etapa;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produtos_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produtos_por_estoque;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tickets_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tickets_por_status;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tickets_por_prioridade;
  -- Refresh existing MVs if they exist
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_dashboard_kpis') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_vendas_por_mes') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_por_mes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_pipeline_por_etapa') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pipeline_por_etapa;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_top_vendedores') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_vendedores;
  END IF;
END;
$$;