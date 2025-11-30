-- Recriar mv_vendas_por_mes com 6 meses de dados (mesmo sem vendas)
DROP MATERIALIZED VIEW IF EXISTS mv_vendas_por_mes;

CREATE MATERIALIZED VIEW mv_vendas_por_mes AS
WITH ultimos_meses AS (
  SELECT generate_series(
    date_trunc('month', NOW()) - INTERVAL '5 months',
    date_trunc('month', NOW()),
    INTERVAL '1 month'
  )::date AS mes
),
vendas_agregadas AS (
  SELECT 
    date_trunc('month', data_venda)::date AS mes,
    SUM(valor_total) AS valor_total,
    COUNT(*) AS quantidade
  FROM vendas
  WHERE data_venda >= date_trunc('month', NOW()) - INTERVAL '5 months'
  GROUP BY date_trunc('month', data_venda)
)
SELECT 
  um.mes,
  to_char(um.mes, 'Mon') AS mes_abrev,
  EXTRACT(MONTH FROM um.mes) AS ordem_mes,
  COALESCE(va.valor_total, 0) AS valor_total,
  COALESCE(va.quantidade, 0) AS quantidade,
  NOW() AS atualizado_em
FROM ultimos_meses um
LEFT JOIN vendas_agregadas va ON um.mes = va.mes
ORDER BY um.mes;

-- Índice para refresh concurrent
CREATE UNIQUE INDEX idx_mv_vendas_por_mes_unique ON mv_vendas_por_mes (mes);

-- Permissões
GRANT SELECT ON mv_vendas_por_mes TO anon, authenticated;

-- Refresh inicial
REFRESH MATERIALIZED VIEW mv_vendas_por_mes;