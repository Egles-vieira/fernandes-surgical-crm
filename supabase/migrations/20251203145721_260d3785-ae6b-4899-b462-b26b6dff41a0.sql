-- Função para obter estatísticas de tabelas do pg_stat_user_tables
CREATE OR REPLACE FUNCTION public.get_table_statistics()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  seq_scan bigint,
  idx_scan bigint,
  n_live_tup bigint,
  n_dead_tup bigint,
  last_vacuum timestamptz,
  last_analyze timestamptz
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
  ORDER BY n_live_tup DESC
  LIMIT 20;
$$;

-- Função para obter estatísticas de conexões do pg_stat_activity
CREATE OR REPLACE FUNCTION public.get_connection_statistics()
RETURNS TABLE (
  state text,
  count bigint,
  application_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(state, 'unknown')::text as state,
    COUNT(*)::bigint as count,
    COALESCE(application_name, 'unknown')::text as application_name
  FROM pg_stat_activity
  WHERE datname = current_database()
  GROUP BY state, application_name
  ORDER BY count DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_table_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connection_statistics() TO authenticated;