-- Drop e recriar função corrigindo referência à tabela roles inexistente
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{}'::jsonb,
  p_dias_historico integer DEFAULT 90
)
RETURNS TABLE (
  id uuid,
  numero_venda text,
  cliente_nome text,
  cliente_id uuid,
  vendedor_nome text,
  vendedor_id uuid,
  etapa_pipeline text,
  status text,
  valor_estimado numeric,
  probabilidade integer,
  data_previsao_fechamento date,
  created_at timestamptz,
  updated_at timestamptz,
  valor_potencial numeric,
  total_etapa bigint,
  has_more boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_manager boolean;
  v_equipes_ids uuid[];
BEGIN
  -- Obter ID do usuário atual
  v_user_id := auth.uid();
  
  -- Verificar se é admin usando user_roles com enum app_role
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = v_user_id 
    AND ur.role IN ('admin', 'diretor_comercial')
  ) INTO v_is_admin;
  
  -- Verificar se é gerente
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = v_user_id 
    AND ur.role IN ('admin', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial', 'manager')
  ) INTO v_is_manager;
  
  -- Obter equipes do usuário
  SELECT ARRAY_AGG(me.equipe_id)
  INTO v_equipes_ids
  FROM membros_equipe me
  WHERE me.usuario_id = v_user_id AND me.ativo = true;

  -- Admin vê todas as vendas
  IF v_is_admin THEN
    RETURN QUERY
    WITH vendas_ranked AS (
      SELECT 
        v.id,
        v.numero_venda,
        COALESCE(c.nome_fantasia, c.nome_emit, 'Cliente não informado') as cliente_nome,
        v.cliente_id,
        COALESCE(p.nome_completo, 'Vendedor não informado') as vendedor_nome,
        v.vendedor_id,
        v.etapa_pipeline,
        v.status,
        v.valor_estimado,
        v.probabilidade,
        v.data_previsao_fechamento,
        v.created_at,
        v.updated_at,
        COALESCE(v.valor_estimado, 0) * COALESCE(v.probabilidade, 0) / 100 as valor_potencial,
        ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.updated_at DESC) as rn,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN perfis_usuario p ON v.vendedor_id = p.id
      WHERE v.created_at >= NOW() - (p_dias_historico || ' days')::interval
        AND v.status NOT IN ('cancelada', 'perdida')
    )
    SELECT 
      vr.id,
      vr.numero_venda,
      vr.cliente_nome,
      vr.cliente_id,
      vr.vendedor_nome,
      vr.vendedor_id,
      vr.etapa_pipeline::text,
      vr.status::text,
      vr.valor_estimado,
      vr.probabilidade,
      vr.data_previsao_fechamento,
      vr.created_at,
      vr.updated_at,
      vr.valor_potencial,
      vr.total_etapa,
      (vr.rn < vr.total_etapa AND vr.rn >= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)) as has_more
    FROM vendas_ranked vr
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)
    ORDER BY vr.etapa_pipeline, vr.updated_at DESC;
    
  -- Manager vê vendas da sua equipe
  ELSIF v_is_manager THEN
    RETURN QUERY
    WITH vendas_ranked AS (
      SELECT 
        v.id,
        v.numero_venda,
        COALESCE(c.nome_fantasia, c.nome_emit, 'Cliente não informado') as cliente_nome,
        v.cliente_id,
        COALESCE(p.nome_completo, 'Vendedor não informado') as vendedor_nome,
        v.vendedor_id,
        v.etapa_pipeline,
        v.status,
        v.valor_estimado,
        v.probabilidade,
        v.data_previsao_fechamento,
        v.created_at,
        v.updated_at,
        COALESCE(v.valor_estimado, 0) * COALESCE(v.probabilidade, 0) / 100 as valor_potencial,
        ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.updated_at DESC) as rn,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN perfis_usuario p ON v.vendedor_id = p.id
      WHERE v.created_at >= NOW() - (p_dias_historico || ' days')::interval
        AND v.status NOT IN ('cancelada', 'perdida')
        AND (
          v.vendedor_id = v_user_id
          OR v.user_id = v_user_id
          OR c.vendedor_id = v_user_id
          OR c.equipe_id = ANY(v_equipes_ids)
          OR EXISTS (
            SELECT 1 FROM membros_equipe me
            WHERE me.equipe_id = ANY(v_equipes_ids)
            AND me.usuario_id = v.vendedor_id
            AND me.ativo = true
          )
        )
    )
    SELECT 
      vr.id,
      vr.numero_venda,
      vr.cliente_nome,
      vr.cliente_id,
      vr.vendedor_nome,
      vr.vendedor_id,
      vr.etapa_pipeline::text,
      vr.status::text,
      vr.valor_estimado,
      vr.probabilidade,
      vr.data_previsao_fechamento,
      vr.created_at,
      vr.updated_at,
      vr.valor_potencial,
      vr.total_etapa,
      (vr.rn < vr.total_etapa AND vr.rn >= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)) as has_more
    FROM vendas_ranked vr
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)
    ORDER BY vr.etapa_pipeline, vr.updated_at DESC;
    
  -- Vendedor vê apenas suas vendas e de seus clientes
  ELSE
    RETURN QUERY
    WITH vendas_ranked AS (
      SELECT 
        v.id,
        v.numero_venda,
        COALESCE(c.nome_fantasia, c.nome_emit, 'Cliente não informado') as cliente_nome,
        v.cliente_id,
        COALESCE(p.nome_completo, 'Vendedor não informado') as vendedor_nome,
        v.vendedor_id,
        v.etapa_pipeline,
        v.status,
        v.valor_estimado,
        v.probabilidade,
        v.data_previsao_fechamento,
        v.created_at,
        v.updated_at,
        COALESCE(v.valor_estimado, 0) * COALESCE(v.probabilidade, 0) / 100 as valor_potencial,
        ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.updated_at DESC) as rn,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN perfis_usuario p ON v.vendedor_id = p.id
      WHERE v.created_at >= NOW() - (p_dias_historico || ' days')::interval
        AND v.status NOT IN ('cancelada', 'perdida')
        AND (
          v.vendedor_id = v_user_id
          OR v.user_id = v_user_id
          OR c.vendedor_id = v_user_id
        )
    )
    SELECT 
      vr.id,
      vr.numero_venda,
      vr.cliente_nome,
      vr.cliente_id,
      vr.vendedor_nome,
      vr.vendedor_id,
      vr.etapa_pipeline::text,
      vr.status::text,
      vr.valor_estimado,
      vr.probabilidade,
      vr.data_previsao_fechamento,
      vr.created_at,
      vr.updated_at,
      vr.valor_potencial,
      vr.total_etapa,
      (vr.rn < vr.total_etapa AND vr.rn >= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)) as has_more
    FROM vendas_ranked vr
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)
    ORDER BY vr.etapa_pipeline, vr.updated_at DESC;
  END IF;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_vendas_pipeline_paginado(jsonb, integer) TO authenticated;