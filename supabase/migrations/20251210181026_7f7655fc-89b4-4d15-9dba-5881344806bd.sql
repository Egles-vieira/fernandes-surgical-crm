-- Corrigir função RPC: converter enum etapa_pipeline para text antes de usar como chave JSONB
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{}',
  p_data_inicio timestamp with time zone DEFAULT NULL,
  p_data_fim timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  numero_venda text,
  etapa_pipeline etapa_pipeline,
  probabilidade integer,
  valor_estimado numeric,
  data_previsao_fechamento date,
  created_at timestamp with time zone,
  cliente_id uuid,
  cliente_nome text,
  cliente_cgc text,
  total_por_etapa bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_is_manager boolean;
  v_hierarchy_level integer;
  v_equipes_ids uuid[];
BEGIN
  -- Buscar informações do usuário
  SELECT 
    bool_or(ur.role = 'admin'),
    bool_or(ur.role IN ('manager', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial'))
  INTO v_is_admin, v_is_manager
  FROM user_roles ur
  WHERE ur.user_id = v_user_id;

  -- Buscar nível hierárquico
  SELECT MIN(rh.nivel) INTO v_hierarchy_level
  FROM user_roles ur
  JOIN role_hierarquia rh ON rh.role::text = ur.role::text
  WHERE ur.user_id = v_user_id;

  -- Buscar equipes do usuário
  SELECT array_agg(DISTINCT me.equipe_id)
  INTO v_equipes_ids
  FROM membros_equipe me
  WHERE me.usuario_id = v_user_id AND me.esta_ativo = true;

  -- Admin vê tudo
  IF v_is_admin THEN
    RETURN QUERY
    WITH vendas_filtradas AS (
      SELECT 
        v.id,
        v.numero_venda,
        v.etapa_pipeline,
        v.probabilidade,
        v.valor_estimado,
        v.data_previsao_fechamento,
        v.created_at,
        v.cliente_id,
        COALESCE(c.nome_abrev, c.nome_emit) as cliente_nome,
        c.cgc as cliente_cgc,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_por_etapa,
        ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.etapa_pipeline IS NOT NULL
        AND (p_data_inicio IS NULL OR v.created_at >= p_data_inicio)
        AND (p_data_fim IS NULL OR v.created_at <= p_data_fim)
    )
    SELECT 
      vr.id,
      vr.numero_venda,
      vr.etapa_pipeline,
      vr.probabilidade,
      vr.valor_estimado,
      vr.data_previsao_fechamento,
      vr.created_at,
      vr.cliente_id,
      vr.cliente_nome,
      vr.cliente_cgc,
      vr.total_por_etapa
    FROM vendas_filtradas vr
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)
    ORDER BY vr.etapa_pipeline, vr.created_at DESC;
    RETURN;
  END IF;

  -- Manager/Gestor vê equipes gerenciadas
  IF v_is_manager OR v_hierarchy_level <= 3 THEN
    RETURN QUERY
    WITH equipes_gerenciadas AS (
      SELECT e.id as equipe_id
      FROM equipes e
      WHERE e.esta_ativa = true
        AND (e.gestor_id = v_user_id OR e.lider_equipe_id = v_user_id)
      UNION
      SELECT me.equipe_id
      FROM membros_equipe me
      WHERE me.usuario_id = v_user_id AND me.esta_ativo = true
    ),
    vendas_filtradas AS (
      SELECT DISTINCT
        v.id,
        v.numero_venda,
        v.etapa_pipeline,
        v.probabilidade,
        v.valor_estimado,
        v.data_previsao_fechamento,
        v.created_at,
        v.cliente_id,
        COALESCE(c.nome_abrev, c.nome_emit) as cliente_nome,
        c.cgc as cliente_cgc,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_por_etapa,
        ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.etapa_pipeline IS NOT NULL
        AND (p_data_inicio IS NULL OR v.created_at >= p_data_inicio)
        AND (p_data_fim IS NULL OR v.created_at <= p_data_fim)
        AND (
          v.vendedor_id = v_user_id
          OR v.user_id = v_user_id
          OR c.vendedor_id = v_user_id
          OR v.equipe_id IN (SELECT eg.equipe_id FROM equipes_gerenciadas eg)
          OR c.equipe_id IN (SELECT eg.equipe_id FROM equipes_gerenciadas eg)
        )
    )
    SELECT 
      vr.id,
      vr.numero_venda,
      vr.etapa_pipeline,
      vr.probabilidade,
      vr.valor_estimado,
      vr.data_previsao_fechamento,
      vr.created_at,
      vr.cliente_id,
      vr.cliente_nome,
      vr.cliente_cgc,
      vr.total_por_etapa
    FROM vendas_filtradas vr
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)
    ORDER BY vr.etapa_pipeline, vr.created_at DESC;
    RETURN;
  END IF;

  -- Vendedor comum vê apenas suas vendas e de clientes atribuídos
  RETURN QUERY
  WITH vendas_filtradas AS (
    SELECT DISTINCT
      v.id,
      v.numero_venda,
      v.etapa_pipeline,
      v.probabilidade,
      v.valor_estimado,
      v.data_previsao_fechamento,
      v.created_at,
      v.cliente_id,
      COALESCE(c.nome_abrev, c.nome_emit) as cliente_nome,
      c.cgc as cliente_cgc,
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_por_etapa,
      ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.etapa_pipeline IS NOT NULL
      AND (p_data_inicio IS NULL OR v.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR v.created_at <= p_data_fim)
      AND (
        v.vendedor_id = v_user_id
        OR v.user_id = v_user_id
        OR c.vendedor_id = v_user_id
        OR (v_equipes_ids IS NOT NULL AND v.equipe_id = ANY(v_equipes_ids))
        OR (v_equipes_ids IS NOT NULL AND c.equipe_id = ANY(v_equipes_ids))
      )
  )
  SELECT 
    vr.id,
    vr.numero_venda,
    vr.etapa_pipeline,
    vr.probabilidade,
    vr.valor_estimado,
    vr.data_previsao_fechamento,
    vr.created_at,
    vr.cliente_id,
    vr.cliente_nome,
    vr.cliente_cgc,
    vr.total_por_etapa
  FROM vendas_filtradas vr
  WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline::text))::int, 20)
  ORDER BY vr.etapa_pipeline, vr.created_at DESC;
END;
$$;