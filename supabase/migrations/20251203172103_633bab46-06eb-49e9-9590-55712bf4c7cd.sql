-- Atualizar função get_table_statistics para retornar mais dados úteis
CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  seq_scan bigint,
  idx_scan bigint,
  n_live_tup bigint,
  n_dead_tup bigint,
  last_vacuum timestamp with time zone,
  last_analyze timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    relname::text as table_name,
    n_live_tup as row_count,
    seq_scan,
    idx_scan,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_analyze
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND (seq_scan > 0 OR idx_scan > 0)  -- Só tabelas com atividade
  ORDER BY (seq_scan + idx_scan) DESC  -- Ordenar por total de scans (mais ativas)
  LIMIT 30;  -- Aumentar limite para 30 tabelas
$$;