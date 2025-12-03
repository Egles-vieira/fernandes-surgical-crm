-- Drop a função antiga e criar nova que aceita limites por etapa
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(INT, INT);

CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(
  p_limites_por_etapa JSONB DEFAULT '{"prospeccao":20,"qualificacao":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20}'::jsonb,
  p_dias_atras INT DEFAULT 90
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_nome TEXT,
  cliente_cnpj TEXT,
  etapa_pipeline TEXT,
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
AS $$
BEGIN
  RETURN QUERY
  WITH vendas_filtradas AS (
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_emit, c.nome_fantasia, 'Cliente não informado') as cliente_nome,
      c.cgc as cliente_cnpj,
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
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.etapa_pipeline NOT IN ('ganho', 'perdido')
      AND v.created_at >= NOW() - (p_dias_atras || ' days')::INTERVAL
  )
  SELECT 
    vf.id,
    vf.numero_venda,
    vf.cliente_nome,
    vf.cliente_cnpj,
    vf.etapa_pipeline,
    vf.valor_estimado,
    vf.valor_total,
    vf.probabilidade,
    vf.data_fechamento_prevista,
    vf.status,
    vf.created_at,
    vf.responsavel_id,
    vf.vendedor_id,
    vf.rn as row_num,
    vf.total_etapa as total_na_etapa
  FROM vendas_filtradas vf
  WHERE vf.rn <= COALESCE((p_limites_por_etapa->>vf.etapa_pipeline)::INT, 20)
  ORDER BY vf.etapa_pipeline, vf.created_at DESC;
END;
$$;