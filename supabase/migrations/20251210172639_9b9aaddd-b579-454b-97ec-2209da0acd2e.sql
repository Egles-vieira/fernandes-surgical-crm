-- Corrigir função get_vendas_pipeline_paginado com nomes corretos das colunas
CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa JSONB DEFAULT '{"leads":20,"contato":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20}'::jsonb,
  p_data_inicio TIMESTAMPTZ DEFAULT NULL,
  p_data_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_nome TEXT,
  cliente_id UUID,
  valor_estimado NUMERIC,
  valor_final NUMERIC,
  probabilidade INTEGER,
  etapa_pipeline TEXT,
  created_at TIMESTAMPTZ,
  vendedor_nome TEXT,
  vendedor_id UUID,
  data_previsao_fechamento DATE,
  total_por_etapa BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_manager BOOLEAN;
  v_equipes_ids UUID[];
  v_equipes_gerenciadas UUID[];
BEGIN
  -- Obter usuário atual
  v_user_id := auth.uid();
  
  -- Verificar roles
  SELECT 
    bool_or(role = 'admin'),
    bool_or(role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial'))
  INTO v_is_admin, v_is_manager
  FROM user_roles
  WHERE user_roles.user_id = v_user_id;
  
  -- Buscar equipes do usuário (CORRIGIDO: usuario_id e esta_ativo)
  SELECT ARRAY_AGG(equipe_id) INTO v_equipes_ids
  FROM membros_equipe
  WHERE usuario_id = v_user_id AND esta_ativo = true;
  
  -- Buscar equipes gerenciadas
  SELECT ARRAY_AGG(e.id) INTO v_equipes_gerenciadas
  FROM equipes e
  WHERE e.gestor_id = v_user_id OR e.lider_equipe_id = v_user_id;

  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT v.*
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE 
      v.excluido_em IS NULL
      AND (p_data_inicio IS NULL OR v.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR v.created_at <= p_data_fim)
      AND (
        -- Admin vê tudo
        v_is_admin = true
        -- Manager vê tudo
        OR v_is_manager = true
        -- Vendedor da venda
        OR v.vendedor_id = v_user_id
        -- Criador da venda
        OR v.user_id = v_user_id
        -- Vendedor do cliente
        OR c.vendedor_id = v_user_id
        -- Membro de equipe do cliente
        OR c.equipe_id = ANY(v_equipes_ids)
        -- Gerencia equipe do cliente
        OR c.equipe_id = ANY(v_equipes_gerenciadas)
      )
  ),
  vendas_com_total AS (
    SELECT 
      va.*,
      COUNT(*) OVER (PARTITION BY va.etapa_pipeline) as total_etapa
    FROM vendas_acessiveis va
  ),
  vendas_numeradas AS (
    SELECT 
      vct.*,
      ROW_NUMBER() OVER (
        PARTITION BY vct.etapa_pipeline 
        ORDER BY vct.created_at DESC
      ) as rn
    FROM vendas_com_total vct
  )
  SELECT 
    vn.id,
    vn.numero_venda,
    COALESCE(c.nome_abrev, c.nome_emit, 'Cliente não informado') as cliente_nome,
    vn.cliente_id,
    vn.valor_estimado,
    vn.valor_final,
    vn.probabilidade,
    vn.etapa_pipeline,
    vn.created_at,
    COALESCE(p.primeiro_nome || ' ' || p.sobrenome, p.primeiro_nome, 'Não atribuído') as vendedor_nome,
    vn.vendedor_id,
    vn.data_previsao_fechamento,
    vn.total_etapa as total_por_etapa
  FROM vendas_numeradas vn
  LEFT JOIN clientes c ON vn.cliente_id = c.id
  LEFT JOIN perfis_usuario p ON vn.vendedor_id = p.id
  WHERE 
    (vn.etapa_pipeline = 'leads' AND vn.rn <= COALESCE((p_limites_por_etapa->>'leads')::int, 20))
    OR (vn.etapa_pipeline = 'contato' AND vn.rn <= COALESCE((p_limites_por_etapa->>'contato')::int, 20))
    OR (vn.etapa_pipeline = 'proposta' AND vn.rn <= COALESCE((p_limites_por_etapa->>'proposta')::int, 20))
    OR (vn.etapa_pipeline = 'negociacao' AND vn.rn <= COALESCE((p_limites_por_etapa->>'negociacao')::int, 20))
    OR (vn.etapa_pipeline = 'followup_cliente' AND vn.rn <= COALESCE((p_limites_por_etapa->>'followup_cliente')::int, 20))
    OR (vn.etapa_pipeline = 'fechamento' AND vn.rn <= COALESCE((p_limites_por_etapa->>'fechamento')::int, 20))
  ORDER BY vn.etapa_pipeline, vn.created_at DESC;
END;
$$;