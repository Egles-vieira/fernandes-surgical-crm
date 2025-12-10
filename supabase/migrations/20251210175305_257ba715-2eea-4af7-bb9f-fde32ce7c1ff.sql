-- Corrigir a função get_vendas_pipeline_paginado usando rh.role ao invés de rh.role_name
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{"prospeccao": 20, "qualificacao": 20, "proposta": 20, "negociacao": 20, "followup_cliente": 20, "fechamento": 20, "ganho": 20, "perdido": 20}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE(
  id UUID,
  numero_venda TEXT,
  cliente_nome TEXT,
  cliente_cgc TEXT,
  etapa_pipeline TEXT,
  valor_estimado NUMERIC,
  valor_total NUMERIC,
  probabilidade INTEGER,
  data_fechamento_prevista DATE,
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
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_manager BOOLEAN;
  v_user_level INTEGER;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = v_user_id AND ur.role = 'admin'
  ) INTO v_is_admin;
  
  -- Se admin, retorna tudo
  IF v_is_admin THEN
    RETURN QUERY
    WITH vendas_com_total AS (
      SELECT 
        v.id,
        v.etapa_pipeline,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
      FROM vendas v
      WHERE v.etapa_pipeline IS NOT NULL
        AND v.created_at >= (NOW() - (p_dias_atras || ' days')::interval)
    ),
    vendas_ranked AS (
      SELECT 
        vct.id,
        vct.etapa_pipeline,
        vct.total_etapa,
        ROW_NUMBER() OVER (PARTITION BY vct.etapa_pipeline ORDER BY v2.created_at DESC) as rn
      FROM vendas_com_total vct
      JOIN vendas v2 ON v2.id = vct.id
    )
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_fantasia, c.nome_emit, c.nome_abrev) as cliente_nome,
      c.cgc as cliente_cgc,
      v.etapa_pipeline,
      v.valor_estimado,
      v.valor_total,
      v.probabilidade,
      v.data_fechamento_prevista,
      v.status,
      v.created_at,
      v.updated_at,
      v.vendedor_id,
      vr.total_etapa as total_na_etapa
    FROM vendas_ranked vr
    JOIN vendas v ON v.id = vr.id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>vr.etapa_pipeline)::int, 20)
    ORDER BY v.etapa_pipeline, v.created_at DESC;
    
    RETURN;
  END IF;
  
  -- Verificar nível hierárquico do usuário
  SELECT MIN(rh.nivel) INTO v_user_level
  FROM user_roles ur
  JOIN role_hierarquia rh ON rh.role::text = ur.role::text
  WHERE ur.user_id = v_user_id;
  
  v_is_manager := COALESCE(v_user_level, 99) <= 3;
  
  -- Se manager (nível <= 3), retorna vendas das equipes que gerencia
  IF v_is_manager THEN
    RETURN QUERY
    WITH equipes_gerenciadas AS (
      SELECT e.id as equipe_id
      FROM equipes e
      WHERE e.esta_ativa = true
        AND (e.gestor_id = v_user_id OR e.lider_equipe_id = v_user_id)
    ),
    usuarios_equipes AS (
      SELECT DISTINCT me.usuario_id
      FROM membros_equipe me
      WHERE me.equipe_id IN (SELECT equipe_id FROM equipes_gerenciadas)
    ),
    vendas_acessiveis AS (
      SELECT DISTINCT v.id
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.etapa_pipeline IS NOT NULL
        AND v.created_at >= (NOW() - (p_dias_atras || ' days')::interval)
        AND (
          v.vendedor_id = v_user_id
          OR v.user_id = v_user_id
          OR v.vendedor_id IN (SELECT usuario_id FROM usuarios_equipes)
          OR c.vendedor_id = v_user_id
          OR c.vendedor_id IN (SELECT usuario_id FROM usuarios_equipes)
        )
    ),
    vendas_com_total AS (
      SELECT 
        va.id,
        v.etapa_pipeline,
        COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
      FROM vendas_acessiveis va
      JOIN vendas v ON v.id = va.id
    ),
    vendas_ranked AS (
      SELECT 
        vct.id,
        vct.etapa_pipeline,
        vct.total_etapa,
        ROW_NUMBER() OVER (PARTITION BY vct.etapa_pipeline ORDER BY v2.created_at DESC) as rn
      FROM vendas_com_total vct
      JOIN vendas v2 ON v2.id = vct.id
    )
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_fantasia, c.nome_emit, c.nome_abrev) as cliente_nome,
      c.cgc as cliente_cgc,
      v.etapa_pipeline,
      v.valor_estimado,
      v.valor_total,
      v.probabilidade,
      v.data_fechamento_prevista,
      v.status,
      v.created_at,
      v.updated_at,
      v.vendedor_id,
      vr.total_etapa as total_na_etapa
    FROM vendas_ranked vr
    JOIN vendas v ON v.id = vr.id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE vr.rn <= COALESCE((p_limites_por_etapa->>vr.etapa_pipeline)::int, 20)
    ORDER BY v.etapa_pipeline, v.created_at DESC;
    
    RETURN;
  END IF;
  
  -- Vendedor comum: apenas suas vendas e de seus clientes
  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT DISTINCT v.id
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.etapa_pipeline IS NOT NULL
      AND v.created_at >= (NOW() - (p_dias_atras || ' days')::interval)
      AND (
        v.vendedor_id = v_user_id
        OR v.user_id = v_user_id
        OR c.vendedor_id = v_user_id
      )
  ),
  vendas_com_total AS (
    SELECT 
      va.id,
      v.etapa_pipeline,
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa
    FROM vendas_acessiveis va
    JOIN vendas v ON v.id = va.id
  ),
  vendas_ranked AS (
    SELECT 
      vct.id,
      vct.etapa_pipeline,
      vct.total_etapa,
      ROW_NUMBER() OVER (PARTITION BY vct.etapa_pipeline ORDER BY v2.created_at DESC) as rn
    FROM vendas_com_total vct
    JOIN vendas v2 ON v2.id = vct.id
  )
  SELECT 
    v.id,
    v.numero_venda,
    COALESCE(c.nome_fantasia, c.nome_emit, c.nome_abrev) as cliente_nome,
    c.cgc as cliente_cgc,
    v.etapa_pipeline,
    v.valor_estimado,
    v.valor_total,
    v.probabilidade,
    v.data_fechamento_prevista,
    v.status,
    v.created_at,
    v.updated_at,
    v.vendedor_id,
    vr.total_etapa as total_na_etapa
  FROM vendas_ranked vr
  JOIN vendas v ON v.id = vr.id
  LEFT JOIN clientes c ON c.id = v.cliente_id
  WHERE vr.rn <= COALESCE((p_limites_por_etapa->>vr.etapa_pipeline)::int, 20)
  ORDER BY v.etapa_pipeline, v.created_at DESC;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_vendas_pipeline_paginado(jsonb, integer) TO authenticated;