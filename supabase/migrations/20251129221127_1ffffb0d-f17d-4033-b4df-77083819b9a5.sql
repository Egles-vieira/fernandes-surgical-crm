-- =============================================
-- VIEWS MATERIALIZADAS PARA DASHBOARD
-- Otimização de performance para 300+ usuários
-- =============================================

-- 1. View Materializada: KPIs Gerais do Dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_kpis AS
SELECT 
  (SELECT COUNT(*) FROM clientes) AS total_clientes,
  (SELECT COUNT(*) FROM produtos) AS total_produtos,
  (SELECT COUNT(*) FROM vendas) AS total_vendas,
  (SELECT COUNT(*) FROM tickets WHERE status = 'aberto') AS tickets_abertos,
  (
    SELECT COALESCE(SUM(COALESCE(valor_estimado, valor_total, 0)), 0)
    FROM vendas 
    WHERE etapa_pipeline NOT IN ('fechamento', 'perdido')
  ) AS valor_pipeline_ativo,
  (
    SELECT CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE etapa_pipeline = 'fechamento')::numeric / COUNT(*)::numeric) * 100)
      ELSE 0 
    END
    FROM vendas
  ) AS taxa_conversao,
  NOW() AS atualizado_em;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_kpis_unique ON mv_dashboard_kpis (atualizado_em);

-- 2. View Materializada: Vendas por Mês (últimos 6 meses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vendas_por_mes AS
SELECT 
  date_trunc('month', created_at)::date AS mes,
  TO_CHAR(date_trunc('month', created_at), 'Mon') AS mes_abrev,
  COUNT(*) AS quantidade,
  COALESCE(SUM(COALESCE(valor_total, valor_estimado, 0)), 0) AS valor_total,
  NOW() AS atualizado_em
FROM vendas
WHERE created_at >= date_trunc('month', NOW() - INTERVAL '5 months')
GROUP BY date_trunc('month', created_at)
ORDER BY mes;

-- Índice para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vendas_por_mes_unique ON mv_vendas_por_mes (mes);

-- 3. View Materializada: Pipeline por Etapa (usando etapa_pipeline::text para evitar erro de enum)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pipeline_por_etapa AS
SELECT 
  COALESCE(etapa_pipeline::text, 'prospeccao') AS etapa,
  CASE COALESCE(etapa_pipeline::text, 'prospeccao')
    WHEN 'prospeccao' THEN 'Prospecção'
    WHEN 'qualificacao' THEN 'Qualificação'
    WHEN 'proposta' THEN 'Proposta'
    WHEN 'negociacao' THEN 'Negociação'
    WHEN 'followup_cliente' THEN 'Follow-up'
    WHEN 'fechamento' THEN 'Fechamento'
    WHEN 'perdido' THEN 'Perdido'
    ELSE 'Outros'
  END AS etapa_label,
  COUNT(*) AS quantidade,
  COALESCE(SUM(COALESCE(valor_total, valor_estimado, 0)), 0) AS valor_total,
  NOW() AS atualizado_em
FROM vendas
GROUP BY etapa_pipeline
ORDER BY 
  CASE COALESCE(etapa_pipeline::text, 'prospeccao')
    WHEN 'prospeccao' THEN 1
    WHEN 'qualificacao' THEN 2
    WHEN 'proposta' THEN 3
    WHEN 'negociacao' THEN 4
    WHEN 'followup_cliente' THEN 5
    WHEN 'fechamento' THEN 6
    WHEN 'perdido' THEN 7
    ELSE 8
  END;

-- Índice para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pipeline_por_etapa_unique ON mv_pipeline_por_etapa (etapa);

-- 4. View Materializada: Top Vendedores
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_vendedores AS
SELECT 
  p.id AS vendedor_id,
  COALESCE(p.primeiro_nome || ' ' || p.sobrenome, p.primeiro_nome, 'Vendedor') AS nome,
  COALESCE(mv.meta_valor, 0) AS meta,
  COALESCE(SUM(CASE WHEN v.aprovado_em IS NOT NULL THEN COALESCE(v.valor_final, v.valor_total, 0) ELSE 0 END), 0) AS realizado,
  CASE 
    WHEN COALESCE(mv.meta_valor, 0) > 0 
    THEN ROUND((COALESCE(SUM(CASE WHEN v.aprovado_em IS NOT NULL THEN COALESCE(v.valor_final, v.valor_total, 0) ELSE 0 END), 0) / mv.meta_valor) * 100)
    ELSE 0 
  END AS percentual,
  NOW() AS atualizado_em
FROM perfis_usuario p
LEFT JOIN vendas v ON v.vendedor_id = p.id 
  AND v.created_at >= date_trunc('month', NOW())
LEFT JOIN metas_vendedor mv ON mv.vendedor_id = p.id 
  AND mv.status IN ('ativa', 'andamento')
  AND NOW() BETWEEN mv.periodo_inicio AND mv.periodo_fim
WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'sales')
GROUP BY p.id, p.primeiro_nome, p.sobrenome, mv.meta_valor
ORDER BY realizado DESC
LIMIT 10;

-- Índice para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_vendedores_unique ON mv_top_vendedores (vendedor_id);

-- 5. Função para refresh de todas as views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh concorrente não bloqueia leituras
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_por_mes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pipeline_por_etapa;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_vendedores;
END;
$$;

-- 6. Habilitar extensões necessárias para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;