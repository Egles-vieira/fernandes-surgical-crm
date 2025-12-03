
-- ===========================================
-- FASE 1: RPC para carregar vendas paginadas por etapa
-- ===========================================

-- Função que retorna TOP N vendas por etapa (evita carregar 2000+ registros)
CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(
  p_limite_por_etapa INT DEFAULT 20,
  p_dias_atras INT DEFAULT 90
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_nome TEXT,
  cliente_cnpj TEXT,
  etapa_pipeline etapa_pipeline,
  valor_estimado NUMERIC,
  valor_total NUMERIC,
  probabilidade INT,
  data_fechamento_prevista DATE,
  status TEXT,
  created_at TIMESTAMPTZ,
  responsavel_id UUID,
  vendedor_id UUID,
  row_num BIGINT,
  total_na_etapa BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_limite TIMESTAMPTZ;
BEGIN
  v_data_limite := NOW() - (p_dias_atras || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH vendas_com_rank AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_nome,
      v.cliente_cnpj,
      v.etapa_pipeline,
      v.valor_estimado,
      v.valor_total,
      v.probabilidade,
      v.data_fechamento_prevista,
      v.status,
      v.created_at,
      v.responsavel_id,
      v.vendedor_id,
      ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn,
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
    FROM vendas v
    WHERE v.etapa_pipeline IS NOT NULL
      AND v.created_at >= v_data_limite
  )
  SELECT 
    vcr.id,
    vcr.numero_venda,
    vcr.cliente_nome,
    vcr.cliente_cnpj,
    vcr.etapa_pipeline,
    vcr.valor_estimado,
    vcr.valor_total,
    vcr.probabilidade,
    vcr.data_fechamento_prevista,
    vcr.status,
    vcr.created_at,
    vcr.responsavel_id,
    vcr.vendedor_id,
    vcr.rn as row_num,
    vcr.total_etapa as total_na_etapa
  FROM vendas_com_rank vcr
  WHERE vcr.rn <= p_limite_por_etapa
  ORDER BY vcr.etapa_pipeline, vcr.created_at DESC;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_vendas_pipeline_paginado TO authenticated;

-- ===========================================
-- FASE 2: Índices otimizados para pipeline
-- ===========================================

-- Índice composto para filtro de pipeline (etapa + created_at)
CREATE INDEX IF NOT EXISTS idx_vendas_pipeline_etapa_created 
ON vendas (etapa_pipeline, created_at DESC) 
WHERE etapa_pipeline IS NOT NULL;

-- Índice para acelerar RLS
CREATE INDEX IF NOT EXISTS idx_vendas_rls_composite 
ON vendas (vendedor_id, user_id);

-- Atualizar estatísticas
ANALYZE vendas;
