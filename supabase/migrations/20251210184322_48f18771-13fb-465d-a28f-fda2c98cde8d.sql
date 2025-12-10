-- Drop da versão específica com bug
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(jsonb, integer);

-- Recriar função com coluna correta esta_ativo
CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(
  p_limites_por_etapa JSONB DEFAULT '{"prospeccao":20,"qualificacao":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20,"ganho":20,"perdido":20}'::jsonb,
  p_dias_historico INTEGER DEFAULT 90
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_id UUID,
  cliente_nome TEXT,
  etapa_pipeline TEXT,
  valor_estimado NUMERIC,
  valor_potencial NUMERIC,
  probabilidade INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  data_previsao_fechamento DATE,
  vendedor_id UUID,
  vendedor_nome TEXT,
  total_etapa BIGINT,
  has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := false;
  v_is_manager BOOLEAN := false;
  v_equipes_ids UUID[];
  v_data_limite TIMESTAMPTZ;
BEGIN
  -- Obter usuário atual
  v_user_id := auth.uid();
  
  -- Calcular data limite
  v_data_limite := NOW() - (p_dias_historico || ' days')::INTERVAL;
  
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = v_user_id 
    AND ur.role IN ('admin', 'diretor_comercial')
  ) INTO v_is_admin;
  
  -- Verificar se é gerente
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = v_user_id 
    AND ur.role IN ('gerente_comercial', 'coordenador_vendas')
  ) INTO v_is_manager;
  
  -- Obter equipes do usuário
  SELECT ARRAY_AGG(DISTINCT equipe_id) INTO v_equipes_ids
  FROM membros_equipe me
  WHERE me.usuario_id = v_user_id AND me.esta_ativo = true;
  
  -- Retornar vendas com paginação por etapa
  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_id,
      COALESCE(c.nome_fantasia, c.nome_emit, 'Cliente não informado') as cliente_nome,
      COALESCE(v.etapa_pipeline, 'prospeccao') as etapa_pipeline,
      COALESCE(v.valor_estimado, 0) as valor_estimado,
      COALESCE(v.valor_estimado * COALESCE(v.probabilidade, 0) / 100, 0) as valor_potencial,
      COALESCE(v.probabilidade, 0) as probabilidade,
      COALESCE(v.status, 'rascunho') as status,
      v.created_at,
      v.updated_at,
      v.data_previsao_fechamento,
      v.vendedor_id,
      COALESCE(p.nome_completo, 'Sem vendedor') as vendedor_nome,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(v.etapa_pipeline, 'prospeccao') 
        ORDER BY v.updated_at DESC
      ) as rn
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN perfis_usuario p ON v.vendedor_id = p.id
    WHERE 
      v.created_at >= v_data_limite
      AND (
        -- Admin vê tudo
        v_is_admin = true
        -- Gerente vê equipes que gerencia
        OR (v_is_manager = true AND (
          v.vendedor_id = v_user_id
          OR c.equipe_id = ANY(v_equipes_ids)
          OR EXISTS (
            SELECT 1 FROM membros_equipe me 
            WHERE me.equipe_id = c.equipe_id 
            AND me.usuario_id = v_user_id 
            AND me.esta_ativo = true
          )
        ))
        -- Vendedor vê suas vendas e de clientes atribuídos
        OR v.vendedor_id = v_user_id
        OR v.user_id = v_user_id
        OR c.vendedor_id = v_user_id
        -- Vendedor vê vendas de clientes da sua equipe
        OR (c.equipe_id IS NOT NULL AND c.equipe_id = ANY(v_equipes_ids))
      )
  ),
  totais_por_etapa AS (
    SELECT 
      etapa_pipeline,
      COUNT(*) as total
    FROM vendas_acessiveis
    GROUP BY etapa_pipeline
  ),
  vendas_com_limite AS (
    SELECT 
      va.*,
      te.total as total_etapa,
      CASE 
        WHEN va.rn <= COALESCE((p_limites_por_etapa->>va.etapa_pipeline)::int, 20) THEN false
        ELSE true
      END as excede_limite
    FROM vendas_acessiveis va
    LEFT JOIN totais_por_etapa te ON va.etapa_pipeline = te.etapa_pipeline
  )
  SELECT 
    vcl.id,
    vcl.numero_venda,
    vcl.cliente_id,
    vcl.cliente_nome,
    vcl.etapa_pipeline,
    vcl.valor_estimado,
    vcl.valor_potencial,
    vcl.probabilidade::integer,
    vcl.status,
    vcl.created_at,
    vcl.updated_at,
    vcl.data_previsao_fechamento,
    vcl.vendedor_id,
    vcl.vendedor_nome,
    vcl.total_etapa,
    (vcl.total_etapa > COALESCE((p_limites_por_etapa->>vcl.etapa_pipeline)::int, 20)) as has_more
  FROM vendas_com_limite vcl
  WHERE vcl.rn <= COALESCE((p_limites_por_etapa->>vcl.etapa_pipeline)::int, 20)
  ORDER BY vcl.etapa_pipeline, vcl.updated_at DESC;
END;
$$;