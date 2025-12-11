-- Corrigir função get_vendas_pipeline_paginado para usar etapas corretas
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE (
  id uuid,
  numero_venda text,
  cliente_nome text,
  cliente_id uuid,
  valor_estimado numeric,
  probabilidade integer,
  etapa_pipeline text,
  created_at timestamptz,
  data_previsao_fechamento timestamptz,
  vendedor_nome text,
  total_itens bigint,
  total_etapa bigint,
  valor_total_etapa numeric,
  valor_potencial_etapa numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_admin boolean;
  _is_manager boolean;
  _user_equipe_ids uuid[];
BEGIN
  -- Verificar roles do usuário
  SELECT 
    bool_or(ur.role IN ('admin', 'diretor_comercial')) INTO _is_admin
  FROM user_roles ur 
  WHERE ur.user_id = _user_id;
  
  SELECT 
    bool_or(ur.role IN ('gerente_comercial', 'coordenador_comercial', 'manager')) INTO _is_manager
  FROM user_roles ur 
  WHERE ur.user_id = _user_id;
  
  -- Buscar equipes do usuário
  SELECT array_agg(me.equipe_id) INTO _user_equipe_ids
  FROM membros_equipe me
  WHERE me.usuario_id = _user_id;

  RETURN QUERY
  WITH vendas_com_totais AS (
    SELECT 
      v.id,
      v.numero_venda,
      COALESCE(c.nome_fantasia, c.nome_emit, c.nome_abrev) as cliente_nome,
      v.cliente_id,
      v.valor_estimado,
      v.probabilidade,
      v.etapa_pipeline,
      v.created_at,
      v.data_fechamento_prevista,
      COALESCE(p.primeiro_nome || ' ' || p.sobrenome, p.primeiro_nome, 'Não atribuído') as vendedor_nome,
      (SELECT COUNT(*) FROM vendas_itens vi WHERE vi.venda_id = v.id) as total_itens,
      -- Calcular totais por etapa usando window functions
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as qtd_real_etapa,
      SUM(COALESCE(v.valor_final, v.valor_estimado, 0)) OVER (PARTITION BY v.etapa_pipeline) as valor_total_etapa,
      SUM(COALESCE(v.valor_final, v.valor_estimado, 0) * COALESCE(v.probabilidade, 50) / 100.0) OVER (PARTITION BY v.etapa_pipeline) as valor_potencial_etapa,
      ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN perfis_usuario p ON p.id = v.vendedor_id
    WHERE 
      v.created_at >= (now() - (p_dias_atras || ' days')::interval)
      AND v.etapa_pipeline IS NOT NULL
      AND (
        -- Admin vê tudo
        COALESCE(_is_admin, false) = true
        OR
        -- Manager vê tudo
        COALESCE(_is_manager, false) = true
        OR
        -- Vendedor vê suas próprias vendas
        v.vendedor_id = _user_id
        OR
        -- Vendedor vê vendas que criou
        v.user_id = _user_id
        OR
        -- Vendedor vê vendas de clientes atribuídos a ele
        c.vendedor_id = _user_id
        OR
        -- Membro da equipe do cliente
        (c.equipe_id IS NOT NULL AND c.equipe_id = ANY(_user_equipe_ids))
      )
  )
  SELECT 
    vct.id,
    vct.numero_venda,
    vct.cliente_nome,
    vct.cliente_id,
    vct.valor_estimado,
    vct.probabilidade,
    vct.etapa_pipeline,
    vct.created_at,
    vct.data_fechamento_prevista,
    vct.vendedor_nome,
    vct.total_itens,
    vct.qtd_real_etapa,
    vct.valor_total_etapa,
    vct.valor_potencial_etapa
  FROM vendas_com_totais vct
  WHERE 
    -- Usar etapas corretas: prospeccao, qualificacao, proposta, negociacao, followup_cliente, fechamento, ganho, perdido
    (vct.etapa_pipeline = 'prospeccao' AND vct.rn <= COALESCE((p_limites_por_etapa->>'prospeccao')::int, 20))
    OR (vct.etapa_pipeline = 'qualificacao' AND vct.rn <= COALESCE((p_limites_por_etapa->>'qualificacao')::int, 20))
    OR (vct.etapa_pipeline = 'proposta' AND vct.rn <= COALESCE((p_limites_por_etapa->>'proposta')::int, 20))
    OR (vct.etapa_pipeline = 'negociacao' AND vct.rn <= COALESCE((p_limites_por_etapa->>'negociacao')::int, 20))
    OR (vct.etapa_pipeline = 'followup_cliente' AND vct.rn <= COALESCE((p_limites_por_etapa->>'followup_cliente')::int, 20))
    OR (vct.etapa_pipeline = 'fechamento' AND vct.rn <= COALESCE((p_limites_por_etapa->>'fechamento')::int, 20))
    OR (vct.etapa_pipeline = 'ganho' AND vct.rn <= COALESCE((p_limites_por_etapa->>'ganho')::int, 20))
    OR (vct.etapa_pipeline = 'perdido' AND vct.rn <= COALESCE((p_limites_por_etapa->>'perdido')::int, 20))
  ORDER BY vct.etapa_pipeline, vct.created_at DESC;
END;
$$;