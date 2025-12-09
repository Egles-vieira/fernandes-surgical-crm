-- Dropar função existente e recriar com filtro de acesso
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, integer);

CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{"leads":20,"contato":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE(
  id uuid,
  numero_venda text,
  cliente_id uuid,
  cliente_nome text,
  cliente_cgc text,
  etapa_pipeline text,
  valor_estimado numeric,
  probabilidade integer,
  previsao_fechamento date,
  created_at timestamptz,
  updated_at timestamptz,
  vendedor_id uuid,
  vendedor_nome text,
  total_itens bigint,
  temperatura text,
  dias_sem_atividade integer,
  row_num bigint,
  total_real bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH vendas_acessiveis AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_id,
      COALESCE(c.nome_fantasia, c.nome_emit, c.nome_abrev) as cliente_nome,
      c.cgc as cliente_cgc,
      v.etapa_pipeline,
      v.valor_estimado,
      v.probabilidade,
      v.previsao_fechamento,
      v.created_at,
      v.updated_at,
      v.vendedor_id,
      COALESCE(p.primeiro_nome || ' ' || p.sobrenome, p.primeiro_nome) as vendedor_nome,
      (SELECT COUNT(*) FROM vendas_itens vi WHERE vi.venda_id = v.id) as total_itens,
      CASE 
        WHEN v.probabilidade >= 70 THEN 'quente'
        WHEN v.probabilidade >= 40 THEN 'morno'
        ELSE 'frio'
      END as temperatura,
      EXTRACT(DAY FROM (now() - COALESCE(v.updated_at, v.created_at)))::integer as dias_sem_atividade
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN perfis_usuario p ON v.vendedor_id = p.id
    WHERE v.etapa_pipeline IS NOT NULL
      AND v.created_at >= (CURRENT_DATE - p_dias_atras * INTERVAL '1 day')
      AND (
        v.vendedor_id = _user_id 
        OR v.user_id = _user_id
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          INNER JOIN role_hierarquia rh ON rh.role = ur.role
          WHERE ur.user_id = _user_id AND rh.nivel <= 3
        )
        OR EXISTS (
          SELECT 1 FROM membros_equipe me
          WHERE me.equipe_id = c.equipe_id 
            AND me.usuario_id = _user_id 
            AND me.esta_ativo = true
        )
      )
  ),
  vendas_numeradas AS (
    SELECT 
      va.*,
      ROW_NUMBER() OVER (PARTITION BY va.etapa_pipeline ORDER BY va.updated_at DESC) as row_num,
      COUNT(*) OVER (PARTITION BY va.etapa_pipeline) as total_real
    FROM vendas_acessiveis va
  )
  SELECT 
    vn.id,
    vn.numero_venda,
    vn.cliente_id,
    vn.cliente_nome,
    vn.cliente_cgc,
    vn.etapa_pipeline,
    vn.valor_estimado,
    vn.probabilidade,
    vn.previsao_fechamento,
    vn.created_at,
    vn.updated_at,
    vn.vendedor_id,
    vn.vendedor_nome,
    vn.total_itens,
    vn.temperatura,
    vn.dias_sem_atividade,
    vn.row_num,
    vn.total_real
  FROM vendas_numeradas vn
  WHERE vn.row_num <= COALESCE(
    (p_limites_por_etapa->>vn.etapa_pipeline)::integer,
    20
  )
  ORDER BY vn.etapa_pipeline, vn.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_vendas_pipeline_paginado IS 'Retorna vendas do pipeline com paginação por etapa. Aplica filtro de acesso baseado em: vendedor, criador, hierarquia de roles, ou membro da equipe do cliente.';