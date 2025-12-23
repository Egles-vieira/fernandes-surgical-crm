-- First DROP the existing function, then CREATE with correct types
DROP FUNCTION IF EXISTS public.get_oportunidades_pipeline_paginado(uuid, jsonb, integer);

-- Recreate with proper TEXT types and SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_oportunidades_pipeline_paginado(
  p_pipeline_id uuid,
  p_filtros jsonb DEFAULT '{}'::jsonb,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  estagio_id uuid,
  estagio_nome text,
  estagio_ordem integer,
  estagio_cor text,
  total_estagio bigint,
  valor_total_estagio numeric,
  oportunidade_id uuid,
  codigo text,
  nome_oportunidade text,
  valor numeric,
  probabilidade integer,
  data_fechamento_prevista date,
  conta_id uuid,
  conta_nome text,
  contato_id uuid,
  contato_nome text,
  proprietario_id uuid,
  campos_customizados jsonb,
  origem_lead text,
  criado_em timestamp with time zone,
  atualizado_em timestamp with time zone,
  esta_estagnada boolean,
  row_num bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_owner_filter uuid;
  v_status_filter text;
BEGIN
  -- Extract filters
  v_owner_filter := (p_filtros->>'proprietario_id')::uuid;
  v_status_filter := p_filtros->>'status';

  RETURN QUERY
  WITH oportunidades_filtradas AS (
    SELECT 
      o.id,
      o.estagio_pipeline_id,
      o.codigo::text AS codigo,
      o.nome_oportunidade::text AS nome_oportunidade,
      COALESCE(o.valor, 0) AS valor,
      o.data_fechamento_prevista,
      o.conta_id,
      o.contato_id,
      o.proprietario_id,
      o.campos_customizados,
      o.origem_lead::text AS origem_lead,
      o.criado_em,
      o.atualizado_em,
      o.esta_estagnada
    FROM oportunidades o
    WHERE o.pipeline_id = p_pipeline_id
      AND COALESCE(o.esta_fechada, false) = false
      AND (v_owner_filter IS NULL OR o.proprietario_id = v_owner_filter)
      AND (v_status_filter IS NULL OR v_status_filter = 'aberto')
  ),
  estagios_com_totais AS (
    SELECT 
      ep.id AS estagio_id,
      ep.nome::text AS estagio_nome,
      ep.ordem AS estagio_ordem,
      ep.cor::text AS estagio_cor,
      COUNT(of2.id)::bigint AS total_estagio,
      COALESCE(SUM(of2.valor), 0)::numeric AS valor_total_estagio
    FROM estagios_pipeline ep
    LEFT JOIN oportunidades_filtradas of2 ON of2.estagio_pipeline_id = ep.id
    WHERE ep.pipeline_id = p_pipeline_id
      AND ep.ativo = true
    GROUP BY ep.id, ep.nome, ep.ordem, ep.cor
  ),
  oportunidades_rankeadas AS (
    SELECT 
      of3.*,
      ep.percentual_probabilidade::integer AS probabilidade,
      c.nome_conta::text AS conta_nome,
      CONCAT(ct.primeiro_nome, ' ', ct.sobrenome)::text AS contato_nome,
      ROW_NUMBER() OVER (
        PARTITION BY of3.estagio_pipeline_id 
        ORDER BY of3.atualizado_em DESC NULLS LAST
      )::bigint AS row_num
    FROM oportunidades_filtradas of3
    LEFT JOIN estagios_pipeline ep ON ep.id = of3.estagio_pipeline_id
    LEFT JOIN contas c ON c.id = of3.conta_id
    LEFT JOIN contatos ct ON ct.id = of3.contato_id
  )
  SELECT 
    ect.estagio_id,
    ect.estagio_nome,
    ect.estagio_ordem,
    ect.estagio_cor,
    ect.total_estagio,
    ect.valor_total_estagio,
    orr.id AS oportunidade_id,
    orr.codigo,
    orr.nome_oportunidade,
    orr.valor,
    orr.probabilidade,
    orr.data_fechamento_prevista,
    orr.conta_id,
    orr.conta_nome,
    orr.contato_id,
    orr.contato_nome,
    orr.proprietario_id,
    orr.campos_customizados,
    orr.origem_lead,
    orr.criado_em,
    orr.atualizado_em,
    COALESCE(orr.esta_estagnada, false) AS esta_estagnada,
    orr.row_num
  FROM estagios_com_totais ect
  LEFT JOIN oportunidades_rankeadas orr 
    ON orr.estagio_pipeline_id = ect.estagio_id 
    AND orr.row_num <= p_limit
  ORDER BY ect.estagio_ordem, orr.row_num NULLS LAST;
END;
$$;