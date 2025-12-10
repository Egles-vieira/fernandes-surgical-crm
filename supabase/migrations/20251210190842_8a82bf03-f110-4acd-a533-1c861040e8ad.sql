-- Corrigir função get_vendas_pipeline_paginado - substituir coordenador_vendas por coordenador_comercial
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{"prospeccao":20,"qualificacao":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20,"ganho":20,"perdido":20}'::jsonb,
  p_dias_historico integer DEFAULT 90
)
RETURNS TABLE (
  id uuid,
  numero_venda text,
  cliente_id uuid,
  cliente_nome text,
  cliente_cgc text,
  valor_estimado numeric,
  valor_total numeric,
  probabilidade integer,
  etapa_pipeline text,
  previsao_fechamento date,
  created_at timestamptz,
  vendedor_id uuid,
  total_na_etapa bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_manager boolean := false;
  v_equipes_ids uuid[];
BEGIN
  -- Verificar se é admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = v_user_id 
    AND ur.role IN ('admin', 'diretor_comercial', 'gerente_comercial')
  ) INTO v_is_admin;
  
  -- Verificar se é gerente de equipe
  SELECT EXISTS(
    SELECT 1 FROM membros_equipe me 
    WHERE me.usuario_id = v_user_id 
    AND me.esta_ativo = true 
    AND me.papel IN ('lider', 'gerente')
  ) INTO v_is_manager;
  
  -- Buscar equipes do usuário
  SELECT ARRAY_AGG(me.equipe_id) INTO v_equipes_ids
  FROM membros_equipe me
  WHERE me.usuario_id = v_user_id AND me.esta_ativo = true;

  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT DISTINCT v.id as venda_id
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE 
      -- Filtro de data
      v.created_at >= (NOW() - (p_dias_historico || ' days')::interval)
      -- Filtro de acesso
      AND (
        v_is_admin = true
        OR v.vendedor_id = v_user_id
        OR v.user_id = v_user_id
        OR c.vendedor_id = v_user_id
        OR (v_is_manager AND c.equipe_id = ANY(v_equipes_ids))
        OR (v_is_manager AND v.user_id IN (
          SELECT me.usuario_id FROM membros_equipe me 
          WHERE me.equipe_id = ANY(v_equipes_ids) AND me.esta_ativo = true
        ))
      )
  ),
  vendas_com_totais AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_id,
      COALESCE(c.nome_emit, c.nome_fantasia, 'Cliente não identificado') as cliente_nome,
      c.cgc as cliente_cgc,
      v.valor_estimado,
      v.valor_total,
      v.probabilidade,
      v.etapa_pipeline,
      v.previsao_fechamento,
      v.created_at,
      v.vendedor_id,
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_na_etapa,
      ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v
    INNER JOIN vendas_acessiveis va ON va.venda_id = v.id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.etapa_pipeline IS NOT NULL
  )
  SELECT 
    vt.id,
    vt.numero_venda,
    vt.cliente_id,
    vt.cliente_nome,
    vt.cliente_cgc,
    vt.valor_estimado,
    vt.valor_total,
    vt.probabilidade,
    vt.etapa_pipeline,
    vt.previsao_fechamento,
    vt.created_at,
    vt.vendedor_id,
    vt.total_na_etapa
  FROM vendas_com_totais vt
  WHERE 
    (vt.etapa_pipeline = 'prospeccao' AND vt.rn <= COALESCE((p_limites_por_etapa->>'prospeccao')::int, 20))
    OR (vt.etapa_pipeline = 'qualificacao' AND vt.rn <= COALESCE((p_limites_por_etapa->>'qualificacao')::int, 20))
    OR (vt.etapa_pipeline = 'proposta' AND vt.rn <= COALESCE((p_limites_por_etapa->>'proposta')::int, 20))
    OR (vt.etapa_pipeline = 'negociacao' AND vt.rn <= COALESCE((p_limites_por_etapa->>'negociacao')::int, 20))
    OR (vt.etapa_pipeline = 'followup_cliente' AND vt.rn <= COALESCE((p_limites_por_etapa->>'followup_cliente')::int, 20))
    OR (vt.etapa_pipeline = 'fechamento' AND vt.rn <= COALESCE((p_limites_por_etapa->>'fechamento')::int, 20))
    OR (vt.etapa_pipeline = 'ganho' AND vt.rn <= COALESCE((p_limites_por_etapa->>'ganho')::int, 20))
    OR (vt.etapa_pipeline = 'perdido' AND vt.rn <= COALESCE((p_limites_por_etapa->>'perdido')::int, 20))
  ORDER BY vt.etapa_pipeline, vt.created_at DESC;
END;
$$;