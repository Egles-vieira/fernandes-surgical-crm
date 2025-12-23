-- Restores the legacy Kanban RPC signature expected by the frontend
-- We must drop first because the return type was changed by a previous migration.

DROP FUNCTION IF EXISTS public.get_oportunidades_pipeline_paginado(uuid, jsonb, integer);

CREATE FUNCTION public.get_oportunidades_pipeline_paginado(
  p_pipeline_id uuid,
  p_limites_por_estagio jsonb DEFAULT '{}'::jsonb,
  p_limite_default integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  codigo text,
  nome_oportunidade text,
  valor numeric,
  data_fechamento date,
  estagio_id uuid,
  percentual_probabilidade integer,
  dias_no_estagio integer,
  campos_customizados jsonb,
  conta_nome text,
  contato_nome text,
  total_estagio bigint,
  valor_total_estagio numeric,
  row_num bigint,
  origem_lead text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH totais_por_estagio AS (
    SELECT 
      o.estagio_id,
      COUNT(*)::bigint as total,
      COALESCE(SUM(o.valor), 0)::numeric as valor_total
    FROM oportunidades o
    WHERE o.pipeline_id = p_pipeline_id
      AND COALESCE(o.esta_fechada, false) = false
      AND o.excluido_em IS NULL
    GROUP BY o.estagio_id
  ),
  oportunidades_numeradas AS (
    SELECT
      o.id,
      o.codigo::text as codigo,
      o.nome_oportunidade::text as nome_oportunidade,
      o.valor,
      o.data_fechamento::date as data_fechamento,
      o.estagio_id,
      ep.percentual_probabilidade::integer as percentual_probabilidade,
      EXTRACT(DAY FROM NOW() - COALESCE(o.data_entrada_estagio, o.criado_em))::INT as dias_no_estagio,
      o.campos_customizados::jsonb as campos_customizados,
      c.nome_conta::text as conta_nome,
      CONCAT(ct.primeiro_nome, ' ', ct.sobrenome)::text as contato_nome,
      COALESCE(t.total, 0)::bigint as total_estagio,
      COALESCE(t.valor_total, 0)::numeric as valor_total_estagio,
      o.origem_lead::text as origem_lead,
      ROW_NUMBER() OVER (
        PARTITION BY o.estagio_id 
        ORDER BY ep.ordem_estagio, o.criado_em DESC
      )::bigint as row_num
    FROM oportunidades o
    INNER JOIN estagios_pipeline ep ON ep.id = o.estagio_id
    LEFT JOIN contas c ON c.id = o.conta_id
    LEFT JOIN contatos ct ON ct.id = o.contato_id
    LEFT JOIN totais_por_estagio t ON t.estagio_id = o.estagio_id
    WHERE o.pipeline_id = p_pipeline_id
      AND COALESCE(o.esta_fechada, false) = false
      AND o.excluido_em IS NULL
  )
  SELECT
    on2.id,
    on2.codigo,
    on2.nome_oportunidade,
    on2.valor,
    on2.data_fechamento,
    on2.estagio_id,
    on2.percentual_probabilidade,
    on2.dias_no_estagio,
    on2.campos_customizados,
    on2.conta_nome,
    on2.contato_nome,
    on2.total_estagio,
    on2.valor_total_estagio,
    on2.row_num,
    on2.origem_lead
  FROM oportunidades_numeradas on2
  WHERE on2.row_num <= COALESCE(
    (p_limites_por_estagio->>on2.estagio_id::text)::int,
    p_limite_default
  )
  ORDER BY on2.estagio_id, on2.row_num;
END;
$function$;