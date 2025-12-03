
-- Drop e recriar função get_vendas_pipeline_paginado com cast correto
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(JSONB, INT);

CREATE FUNCTION get_vendas_pipeline_paginado(
  p_limites_por_etapa JSONB DEFAULT '{"prospeccao": 20, "qualificacao": 20, "proposta": 20, "negociacao": 20, "followup_cliente": 20, "fechamento": 20, "ganho": 20, "perdido": 20}',
  p_dias_atras INT DEFAULT 90
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_nome TEXT,
  valor_estimado NUMERIC,
  probabilidade INT,
  etapa_pipeline TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  vendedor_id UUID,
  total_na_etapa BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vendas_filtradas AS (
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_emit, c.nome_fantasia, 'Cliente não definido') as cliente_nome,
      COALESCE(v.valor_final, v.valor_estimado, 0) as valor_estimado,
      COALESCE(v.probabilidade, 50) as probabilidade,
      v.etapa_pipeline,
      v.status::TEXT as status,
      v.created_at,
      v.updated_at,
      v.vendedor_id,
      ROW_NUMBER() OVER (
        PARTITION BY v.etapa_pipeline 
        ORDER BY v.updated_at DESC
      ) as rn,
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_na_etapa
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.etapa_pipeline IS NOT NULL
      AND v.created_at >= (CURRENT_DATE - p_dias_atras * INTERVAL '1 day')
  )
  SELECT 
    vf.id,
    vf.numero_venda,
    vf.cliente_nome,
    vf.valor_estimado,
    vf.probabilidade,
    vf.etapa_pipeline::TEXT,
    vf.status,
    vf.created_at,
    vf.updated_at,
    vf.vendedor_id,
    vf.total_na_etapa
  FROM vendas_filtradas vf
  WHERE vf.rn <= COALESCE((p_limites_por_etapa->>(vf.etapa_pipeline::TEXT))::INT, 20)
  ORDER BY vf.etapa_pipeline, vf.updated_at DESC;
END;
$$;
