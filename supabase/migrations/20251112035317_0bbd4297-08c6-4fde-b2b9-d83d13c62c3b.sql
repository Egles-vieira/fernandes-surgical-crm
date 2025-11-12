-- Drop and recreate RPCs with correct schemas
DROP FUNCTION IF EXISTS public.get_kpis_gerais_periodo(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_pacing_semanal(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_funil_vendas(timestamptz, timestamptz);

-- 1) KPIs gerais do período
CREATE OR REPLACE FUNCTION public.get_kpis_gerais_periodo(
  p_data_inicio timestamptz,
  p_data_fim timestamptz
)
RETURNS TABLE (
  total_meta numeric,
  total_realizado numeric,
  percentual_atingimento numeric,
  pacing numeric,
  numero_equipes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH metas_e AS (
    SELECT COALESCE(SUM(me.valor_objetivo), 0) AS total
    FROM public.metas_equipe me
    WHERE me.status IN ('ativa','andamento','concluida')
      AND tstzrange(me.periodo_inicio, me.periodo_fim, '[]') && tstzrange(p_data_inicio, p_data_fim, '[]')
  ), metas_v AS (
    SELECT COALESCE(SUM(mv.meta_valor), 0) AS total
    FROM public.metas_vendedor mv
    WHERE mv.status IN ('ativa','andamento','concluida')
      AND tstzrange(mv.periodo_inicio, mv.periodo_fim, '[]') && tstzrange(p_data_inicio, p_data_fim, '[]')
  ), realizado AS (
    SELECT COALESCE(SUM(COALESCE(v.valor_final, 0)), 0) AS total
    FROM public.vendas v
    WHERE v.aprovado_em IS NOT NULL
      AND v.aprovado_em >= p_data_inicio
      AND v.aprovado_em <= p_data_fim
  )
  SELECT 
    (me.total + mv.total) AS total_meta,
    r.total AS total_realizado,
    CASE WHEN (me.total + mv.total) > 0 THEN (r.total / (me.total + mv.total)) * 100 ELSE 0 END AS percentual_atingimento,
    CASE 
      WHEN EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio)) > 0 THEN (
        CASE WHEN (me.total + mv.total) > 0 THEN (r.total / (me.total + mv.total)) * 100 ELSE 0 END
      ) - (
        EXTRACT(EPOCH FROM (LEAST(now(), p_data_fim) - p_data_inicio))
        / EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio))
      ) * 100
      ELSE 0
    END AS pacing,
    (SELECT COUNT(*) FROM public.equipes e WHERE e.esta_ativa = true AND e.excluido_em IS NULL)::integer AS numero_equipes
  FROM metas_e me, metas_v mv, realizado r;
END;
$$;

-- 2) Pacing semanal
CREATE OR REPLACE FUNCTION public.get_pacing_semanal(
  p_periodo_inicio timestamptz,
  p_periodo_fim timestamptz
)
RETURNS TABLE (
  semana text,
  data_semana date,
  realizado numeric,
  meta numeric,
  projecao numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH semanas AS (
    SELECT generate_series(
      date_trunc('week', p_periodo_inicio)::date,
      date_trunc('week', p_periodo_fim)::date,
      interval '1 week'
    )::date AS semana_inicio
  ), realizado_por_semana AS (
    SELECT 
      date_trunc('week', v.aprovado_em)::date AS semana_inicio,
      SUM(COALESCE(v.valor_final, 0)) AS realizado
    FROM public.vendas v
    WHERE v.aprovado_em IS NOT NULL
      AND v.aprovado_em >= p_periodo_inicio
      AND v.aprovado_em <= p_periodo_fim
    GROUP BY 1
  ), totais AS (
    SELECT
      COALESCE((
        SELECT SUM(me.valor_objetivo)
        FROM public.metas_equipe me
        WHERE me.status IN ('ativa','andamento','concluida')
          AND tstzrange(me.periodo_inicio, me.periodo_fim, '[]') && tstzrange(p_periodo_inicio, p_periodo_fim, '[]')
      ), 0)
      + COALESCE((
        SELECT SUM(mv.meta_valor)
        FROM public.metas_vendedor mv
        WHERE mv.status IN ('ativa','andamento','concluida')
          AND tstzrange(mv.periodo_inicio, mv.periodo_fim, '[]') && tstzrange(p_periodo_inicio, p_periodo_fim, '[]')
      ), 0) AS total_meta,
      (SELECT COUNT(*) FROM semanas) AS num_semanas,
      COALESCE((
        SELECT SUM(COALESCE(v.valor_final, 0))
        FROM public.vendas v
        WHERE v.aprovado_em IS NOT NULL
          AND v.aprovado_em >= p_periodo_inicio
          AND v.aprovado_em <= LEAST(now(), p_periodo_fim)
      ), 0) AS realizado_ate_agora,
      GREATEST(1, (EXTRACT(EPOCH FROM (LEAST(now(), p_periodo_fim) - p_periodo_inicio)) / 86400))::numeric AS dias_decorridos,
      GREATEST(1, (EXTRACT(EPOCH FROM (p_periodo_fim - p_periodo_inicio)) / 86400))::numeric AS dias_totais
  )
  SELECT 
    to_char(s.semana_inicio, 'IYYY-IW') AS semana,
    s.semana_inicio AS data_semana,
    COALESCE(r.realizado, 0) AS realizado,
    CASE WHEN t.num_semanas > 0 THEN t.total_meta / t.num_semanas ELSE 0 END AS meta,
    CASE 
      WHEN t.dias_decorridos > 0 AND t.num_semanas > 0 THEN ((t.realizado_ate_agora / t.dias_decorridos) * t.dias_totais) / t.num_semanas
      ELSE 0
    END AS projecao
  FROM semanas s
  LEFT JOIN realizado_por_semana r ON r.semana_inicio = s.semana_inicio
  CROSS JOIN totais t
  ORDER BY s.semana_inicio;
END;
$$;

-- 3) Funil de vendas por etapa do pipeline
CREATE OR REPLACE FUNCTION public.get_funil_vendas(
  p_periodo_inicio timestamptz,
  p_periodo_fim timestamptz
)
RETURNS TABLE (
  etapa text,
  quantidade integer,
  valor_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(v.etapa_pipeline::text, 'sem_etapa') AS etapa,
    COUNT(*)::integer AS quantidade,
    SUM(COALESCE(v.valor_final, v.valor_estimado, 0)) AS valor_total
  FROM public.vendas v
  WHERE v.created_at >= p_periodo_inicio
    AND v.created_at <= p_periodo_fim
  GROUP BY 1
  ORDER BY 3 DESC;
END;
$$;