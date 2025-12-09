
-- Corrige o erro de tipo no operador jsonb ->> com coluna
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE (
  id uuid,
  numero_venda text,
  cliente_nome text,
  etapa_pipeline text,
  valor_estimado numeric,
  probabilidade integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  vendedor_id uuid,
  total_na_etapa bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vendas_filtradas AS (
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_emit, c.nome_fantasia, 'Cliente não informado') as cliente_nome,
      v.etapa_pipeline::text as etapa_pipeline,
      v.valor_estimado,
      v.probabilidade,
      v.status,
      v.created_at,
      v.updated_at,
      v.vendedor_id
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.etapa_pipeline IS NOT NULL
      AND v.created_at >= (CURRENT_DATE - p_dias_atras * INTERVAL '1 day')
      AND (
        v.vendedor_id = auth.uid()
        OR v.user_id = auth.uid()
        OR c.vendedor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          INNER JOIN role_hierarquia rh ON rh.role = ur.role
          WHERE ur.user_id = auth.uid() AND rh.nivel <= 3
        )
        OR EXISTS (
          SELECT 1 FROM membros_equipe me
          WHERE me.equipe_id = c.equipe_id 
            AND me.usuario_id = auth.uid() 
            AND me.esta_ativo = true
        )
      )
  ),
  vendas_com_total AS (
    SELECT 
      vf.*,
      COUNT(*) OVER (PARTITION BY vf.etapa_pipeline) as total_na_etapa,
      ROW_NUMBER() OVER (PARTITION BY vf.etapa_pipeline ORDER BY vf.updated_at DESC) as rn
    FROM vendas_filtradas vf
  )
  SELECT 
    vct.id,
    vct.numero_venda,
    vct.cliente_nome,
    vct.etapa_pipeline,
    vct.valor_estimado,
    vct.probabilidade,
    vct.status,
    vct.created_at,
    vct.updated_at,
    vct.vendedor_id,
    vct.total_na_etapa
  FROM vendas_com_total vct
  WHERE vct.rn <= COALESCE(
    (p_limites_por_etapa ->> vct.etapa_pipeline)::integer,
    20
  )
  ORDER BY vct.etapa_pipeline, vct.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_vendas_pipeline_paginado(jsonb, integer) TO authenticated;
