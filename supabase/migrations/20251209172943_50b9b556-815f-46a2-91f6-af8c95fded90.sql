
-- Corrige ambiguidade de colunas na RPC get_vendas_pipeline_paginado
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
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
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Log para debug
  RAISE NOTICE 'Current user: %', current_user_id;
  
  RETURN QUERY
  WITH vendas_filtradas AS (
    SELECT 
      v.id as venda_id,
      v.numero_venda as venda_numero,
      COALESCE(c.nome_emit, c.nome_fantasia, 'Cliente não informado') as venda_cliente_nome,
      v.etapa_pipeline::text as venda_etapa,
      v.valor_estimado as venda_valor,
      v.probabilidade as venda_prob,
      v.status as venda_status,
      v.created_at as venda_created,
      v.updated_at as venda_updated,
      v.vendedor_id as venda_vendedor
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.etapa_pipeline IS NOT NULL
      AND v.created_at >= (CURRENT_DATE - p_dias_atras * INTERVAL '1 day')
      AND (
        v.vendedor_id = current_user_id
        OR v.user_id = current_user_id
        OR c.vendedor_id = current_user_id
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          INNER JOIN role_hierarquia rh ON rh.role = ur.role
          WHERE ur.user_id = current_user_id AND rh.nivel <= 3
        )
        OR EXISTS (
          SELECT 1 FROM membros_equipe me
          WHERE me.equipe_id = c.equipe_id 
            AND me.usuario_id = current_user_id 
            AND me.esta_ativo = true
        )
      )
  ),
  vendas_com_total AS (
    SELECT 
      vf.venda_id,
      vf.venda_numero,
      vf.venda_cliente_nome,
      vf.venda_etapa,
      vf.venda_valor,
      vf.venda_prob,
      vf.venda_status,
      vf.venda_created,
      vf.venda_updated,
      vf.venda_vendedor,
      COUNT(*) OVER (PARTITION BY vf.venda_etapa) as etapa_total,
      ROW_NUMBER() OVER (PARTITION BY vf.venda_etapa ORDER BY vf.venda_updated DESC) as rn
    FROM vendas_filtradas vf
  )
  SELECT 
    vct.venda_id,
    vct.venda_numero,
    vct.venda_cliente_nome,
    vct.venda_etapa,
    vct.venda_valor,
    vct.venda_prob,
    vct.venda_status,
    vct.venda_created,
    vct.venda_updated,
    vct.venda_vendedor,
    vct.etapa_total
  FROM vendas_com_total vct
  WHERE vct.rn <= COALESCE(
    (p_limites_por_etapa ->> vct.venda_etapa)::integer,
    20
  )
  ORDER BY vct.venda_etapa, vct.venda_updated DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendas_pipeline_paginado(jsonb, integer) TO authenticated;
