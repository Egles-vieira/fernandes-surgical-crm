-- Conceder permissão de leitura nas Views Materializadas para usuários autenticados e anônimos
GRANT SELECT ON mv_dashboard_kpis TO anon, authenticated;
GRANT SELECT ON mv_vendas_por_mes TO anon, authenticated;
GRANT SELECT ON mv_pipeline_por_etapa TO anon, authenticated;
GRANT SELECT ON mv_top_vendedores TO anon, authenticated;