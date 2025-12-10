-- =====================================================
-- CORRIGIR FUNÇÃO get_vendas_pipeline_paginado
-- Trocar data_previsao_fechamento por data_fechamento_prevista
-- Garantir retorno de status e total_na_etapa
-- =====================================================

DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{"prospeccao": 20, "qualificacao": 20, "proposta": 20, "negociacao": 20, "followup_cliente": 20, "fechamento": 20, "ganho": 20, "perdido": 20}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE(
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
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_is_manager boolean;
  v_user_level integer;
  v_data_limite timestamptz := now() - (p_dias_atras || ' days')::interval;
BEGIN
  -- Verificar permissões do usuário
  SELECT 
    COALESCE(bool_or(ur.role = 'admin'), false),
    COALESCE(bool_or(ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial')), false)
  INTO v_is_admin, v_is_manager
  FROM user_roles ur
  WHERE ur.user_id = v_user_id;

  -- Buscar nível hierárquico
  SELECT MIN(rh.nivel) INTO v_user_level
  FROM user_roles ur
  JOIN role_hierarquia rh ON rh.role_name = ur.role::text
  WHERE ur.user_id = v_user_id;

  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT DISTINCT v.id as venda_id
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN membros_equipe me ON me.equipe_id = c.equipe_id 
      AND me.usuario_id = v_user_id 
      AND me.esta_ativo = true
    WHERE v.created_at >= v_data_limite
      AND (
        -- Admin ou manager vê tudo
        v_is_admin = true
        OR v_is_manager = true
        OR COALESCE(v_user_level, 999) <= 3
        -- Vendedor da venda
        OR v.vendedor_id = v_user_id
        -- Criador da venda
        OR v.user_id = v_user_id
        -- Vendedor do cliente
        OR c.vendedor_id = v_user_id
        -- Membro ativo da equipe do cliente
        OR me.usuario_id IS NOT NULL
      )
  ),
  vendas_com_total AS (
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_abrev, c.nome_emit, 'Cliente não identificado') as cliente_nome,
      COALESCE(v.etapa_pipeline, 'prospeccao')::text as etapa_pipeline,
      COALESCE(v.valor_estimado, 0) as valor_estimado,
      COALESCE(v.probabilidade, 0) as probabilidade,
      COALESCE(v.status, 'rascunho')::text as status,
      v.created_at,
      v.updated_at,
      v.vendedor_id,
      COUNT(*) OVER (PARTITION BY COALESCE(v.etapa_pipeline, 'prospeccao')) as total_na_etapa,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(v.etapa_pipeline, 'prospeccao') 
        ORDER BY v.data_fechamento_prevista ASC NULLS LAST, v.created_at DESC
      ) as rn
    FROM vendas v
    INNER JOIN vendas_acessiveis va ON va.venda_id = v.id
    LEFT JOIN clientes c ON c.id = v.cliente_id
  )
  SELECT 
    vct.id,
    vct.numero_venda,
    vct.cliente_nome,
    vct.etapa_pipeline,
    vct.valor_estimado,
    vct.probabilidade::integer,
    vct.status,
    vct.created_at,
    vct.updated_at,
    vct.vendedor_id,
    vct.total_na_etapa
  FROM vendas_com_total vct
  WHERE vct.rn <= COALESCE((p_limites_por_etapa->>vct.etapa_pipeline)::integer, 20)
  ORDER BY vct.etapa_pipeline, vct.rn;
END;
$function$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_vendas_pipeline_paginado(jsonb, integer) TO authenticated;