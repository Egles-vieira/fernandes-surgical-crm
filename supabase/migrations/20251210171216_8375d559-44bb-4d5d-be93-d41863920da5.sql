-- Drop e recriar RPC para incluir nome do vendedor
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(JSONB, INTEGER);

CREATE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa JSONB DEFAULT '{"leads":20,"contato":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20}'::jsonb,
  p_dias_atras INTEGER DEFAULT 90
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_id UUID,
  cliente_nome TEXT,
  cliente_cnpj TEXT,
  etapa_pipeline TEXT,
  valor_estimado NUMERIC,
  valor_total NUMERIC,
  probabilidade INTEGER,
  data_fechamento_prevista DATE,
  created_at TIMESTAMPTZ,
  vendedor_id UUID,
  vendedor_nome TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_manager BOOLEAN;
  v_equipes_ids UUID[];
BEGIN
  SELECT 
    EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = v_user_id AND r.slug IN ('admin', 'diretor_comercial')),
    EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = v_user_id AND r.nivel <= 3)
  INTO v_is_admin, v_is_manager;
  
  SELECT ARRAY_AGG(equipe_id) INTO v_equipes_ids
  FROM membros_equipe
  WHERE user_id = v_user_id AND ativo = true;

  RETURN QUERY
  WITH vendas_com_limite AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_id,
      COALESCE(c.nome_emit, c.nome_fantasia, 'Cliente não informado') as cliente_nome,
      c.cgc as cliente_cnpj,
      v.etapa_pipeline,
      COALESCE(v.valor_estimado, 0) as valor_estimado,
      COALESCE(v.valor_total, 0) as valor_total,
      COALESCE(v.probabilidade, 0) as probabilidade,
      v.data_fechamento_prevista,
      v.created_at,
      v.vendedor_id,
      COALESCE(p.nome_completo, 'Sem vendedor') as vendedor_nome,
      ROW_NUMBER() OVER (
        PARTITION BY v.etapa_pipeline 
        ORDER BY v.created_at DESC
      ) as rn
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN perfis_usuario p ON v.vendedor_id = p.id
    WHERE 
      v.etapa_pipeline IS NOT NULL
      AND v.etapa_pipeline != 'ganho'
      AND v.etapa_pipeline != 'perdido'
      AND v.created_at >= (CURRENT_DATE - p_dias_atras)
      AND (
        v_is_admin
        OR v_is_manager
        OR v.vendedor_id = v_user_id
        OR v.user_id = v_user_id
        OR c.vendedor_id = v_user_id
        OR c.equipe_id = ANY(v_equipes_ids)
      )
  )
  SELECT 
    vcl.id,
    vcl.numero_venda,
    vcl.cliente_id,
    vcl.cliente_nome,
    vcl.cliente_cnpj,
    vcl.etapa_pipeline,
    vcl.valor_estimado,
    vcl.valor_total,
    vcl.probabilidade,
    vcl.data_fechamento_prevista,
    vcl.created_at,
    vcl.vendedor_id,
    vcl.vendedor_nome
  FROM vendas_com_limite vcl
  WHERE vcl.rn <= COALESCE(
    (p_limites_por_etapa->>vcl.etapa_pipeline)::INT,
    20
  )
  ORDER BY vcl.etapa_pipeline, vcl.created_at DESC;
END;
$$;