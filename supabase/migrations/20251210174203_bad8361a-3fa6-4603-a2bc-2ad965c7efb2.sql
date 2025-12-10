-- Primeiro, dropar a função existente
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, integer);

-- Recriar a função com as correções
CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{"prospeccao": 20, "qualificacao": 20, "proposta": 20, "negociacao": 20, "followup_cliente": 20, "fechamento": 20}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE(
  id uuid,
  numero_venda text,
  cliente_nome text,
  cliente_id uuid,
  valor_estimado numeric,
  probabilidade integer,
  etapa_pipeline text,
  created_at timestamptz,
  updated_at timestamptz,
  vendedor_nome text,
  vendedor_id uuid,
  data_previsao_fechamento date,
  observacoes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_manager BOOLEAN;
  v_equipes_ids UUID[];
BEGIN
  -- Verificar roles do usuário
  SELECT 
    EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role IN ('admin', 'diretor_comercial')),
    EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role IN ('admin', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial', 'manager'))
  INTO v_is_admin, v_is_manager;
  
  -- Buscar equipes do usuário (CORRIGIDO: usuario_id e esta_ativo)
  SELECT ARRAY_AGG(equipe_id) INTO v_equipes_ids
  FROM membros_equipe
  WHERE usuario_id = v_user_id AND esta_ativo = true;

  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT v.id, v.numero_venda, v.valor_estimado, v.probabilidade, 
           v.etapa_pipeline, v.created_at, v.updated_at, v.vendedor_id,
           v.data_previsao_fechamento, v.observacoes, v.cliente_id,
           ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.created_at >= (CURRENT_DATE - p_dias_atras * INTERVAL '1 day')
      AND v.status != 'cancelada'
      AND (
        v_is_admin = true
        OR v_is_manager = true
        OR v.vendedor_id = v_user_id
        OR v.user_id = v_user_id
        OR c.vendedor_id = v_user_id
        OR c.equipe_id = ANY(v_equipes_ids)
      )
  )
  SELECT 
    va.id,
    va.numero_venda,
    COALESCE(c.nome_fantasia, c.nome_emit, 'Cliente não informado') as cliente_nome,
    va.cliente_id,
    COALESCE(va.valor_estimado, 0) as valor_estimado,
    COALESCE(va.probabilidade, 0) as probabilidade,
    va.etapa_pipeline,
    va.created_at,
    va.updated_at,
    COALESCE(p.nome_completo, 'Vendedor não atribuído') as vendedor_nome,
    va.vendedor_id,
    va.data_previsao_fechamento,
    va.observacoes
  FROM vendas_acessiveis va
  LEFT JOIN clientes c ON va.cliente_id = c.id
  LEFT JOIN perfis_usuario p ON va.vendedor_id = p.id
  WHERE (
    (va.etapa_pipeline = 'prospeccao' AND va.rn <= COALESCE((p_limites_por_etapa->>'prospeccao')::int, 20))
    OR (va.etapa_pipeline = 'qualificacao' AND va.rn <= COALESCE((p_limites_por_etapa->>'qualificacao')::int, 20))
    OR (va.etapa_pipeline = 'proposta' AND va.rn <= COALESCE((p_limites_por_etapa->>'proposta')::int, 20))
    OR (va.etapa_pipeline = 'negociacao' AND va.rn <= COALESCE((p_limites_por_etapa->>'negociacao')::int, 20))
    OR (va.etapa_pipeline = 'followup_cliente' AND va.rn <= COALESCE((p_limites_por_etapa->>'followup_cliente')::int, 20))
    OR (va.etapa_pipeline = 'fechamento' AND va.rn <= COALESCE((p_limites_por_etapa->>'fechamento')::int, 20))
  )
  ORDER BY va.etapa_pipeline, va.created_at DESC;
END;
$function$;