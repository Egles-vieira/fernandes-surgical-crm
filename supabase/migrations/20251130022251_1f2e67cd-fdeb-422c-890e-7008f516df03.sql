-- Recriar MV com cálculo corrigido para valor_pipeline_ativo
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_kpis;

CREATE MATERIALIZED VIEW mv_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM clientes) AS total_clientes,
  (SELECT COUNT(*) FROM produtos) AS total_produtos,
  (SELECT COUNT(*) FROM vendas) AS total_vendas,
  (SELECT COUNT(*) FROM tickets WHERE status = 'aberto') AS tickets_abertos,
  (
    SELECT COALESCE(SUM(
      CASE 
        WHEN valor_estimado IS NOT NULL AND valor_estimado > 0 THEN valor_estimado
        ELSE COALESCE(valor_total, 0)
      END
    ), 0)
    FROM vendas
    WHERE etapa_pipeline NOT IN ('fechamento', 'perdido')
  ) AS valor_pipeline_ativo,
  (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE etapa_pipeline = 'fechamento')::numeric / COUNT(*)::numeric * 100)
        ELSE 0
      END
    FROM vendas
  ) AS taxa_conversao,
  NOW() AS atualizado_em;

-- Criar índice único para refresh concurrent
CREATE UNIQUE INDEX idx_mv_dashboard_kpis_unique ON mv_dashboard_kpis (atualizado_em);

-- Conceder permissões
GRANT SELECT ON mv_dashboard_kpis TO anon, authenticated;

-- Refresh inicial
REFRESH MATERIALIZED VIEW mv_dashboard_kpis;