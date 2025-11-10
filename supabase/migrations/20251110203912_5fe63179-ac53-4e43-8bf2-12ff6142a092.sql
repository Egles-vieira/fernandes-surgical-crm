-- Função para obter KPIs gerais do período
CREATE OR REPLACE FUNCTION get_kpis_gerais_periodo(
  p_data_inicio timestamp with time zone DEFAULT date_trunc('month', now()),
  p_data_fim timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  total_meta numeric,
  total_realizado numeric,
  percentual_atingimento numeric,
  pacing numeric,
  numero_equipes bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH metas_periodo AS (
    SELECT 
      COALESCE(SUM(m.valor_objetivo), 0) as meta_total,
      COALESCE(SUM(m.valor_atual), 0) as realizado_total,
      COUNT(DISTINCT m.equipe_id) as total_equipes
    FROM metas_equipe m
    WHERE m.status = 'ativa'
      AND m.periodo_inicio <= p_data_fim
      AND m.periodo_fim >= p_data_inicio
  ),
  calculo_pacing AS (
    SELECT 
      mp.meta_total,
      mp.realizado_total,
      mp.total_equipes,
      CASE 
        WHEN mp.meta_total > 0 THEN (mp.realizado_total / mp.meta_total * 100)
        ELSE 0 
      END as perc_atingimento,
      CASE 
        WHEN EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio)) > 0 THEN
          (mp.realizado_total / NULLIF(mp.meta_total, 0)) / 
          (EXTRACT(EPOCH FROM (now() - p_data_inicio)) / EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio)))
          * 100
        ELSE 0
      END as pacing_calc
    FROM metas_periodo mp
  )
  SELECT 
    cp.meta_total,
    cp.realizado_total,
    cp.perc_atingimento,
    COALESCE(cp.pacing_calc, 0) as pacing,
    cp.total_equipes
  FROM calculo_pacing cp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter pacing semanal
CREATE OR REPLACE FUNCTION get_pacing_semanal(
  p_periodo_inicio timestamp with time zone DEFAULT date_trunc('month', now()),
  p_periodo_fim timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  semana text,
  data_semana date,
  realizado numeric,
  meta numeric,
  projecao numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH weeks AS (
    SELECT 
      date_trunc('week', d)::date as week_start
    FROM generate_series(
      date_trunc('week', p_periodo_inicio),
      date_trunc('week', p_periodo_fim),
      '1 week'::interval
    ) d
  ),
  metas_totais AS (
    SELECT 
      COALESCE(SUM(m.valor_objetivo), 0) as meta_total
    FROM metas_equipe m
    WHERE m.status = 'ativa'
      AND m.periodo_inicio <= p_periodo_fim
      AND m.periodo_fim >= p_periodo_inicio
  ),
  progresso_por_semana AS (
    SELECT 
      date_trunc('week', pm.registrado_em)::date as week_start,
      COALESCE(SUM(pm.valor_novo), 0) as valor_semana
    FROM progresso_metas pm
    WHERE pm.registrado_em BETWEEN p_periodo_inicio AND p_periodo_fim
    GROUP BY date_trunc('week', pm.registrado_em)::date
  )
  SELECT 
    'Semana ' || EXTRACT(WEEK FROM w.week_start)::text as semana,
    w.week_start,
    COALESCE(ps.valor_semana, 0) as realizado,
    (mt.meta_total / NULLIF(EXTRACT(EPOCH FROM (p_periodo_fim - p_periodo_inicio)) / 604800, 0))::numeric as meta,
    CASE 
      WHEN w.week_start <= CURRENT_DATE THEN COALESCE(ps.valor_semana, 0)
      ELSE (mt.meta_total / NULLIF(EXTRACT(EPOCH FROM (p_periodo_fim - p_periodo_inicio)) / 604800, 0))::numeric
    END as projecao
  FROM weeks w
  CROSS JOIN metas_totais mt
  LEFT JOIN progresso_por_semana ps ON ps.week_start = w.week_start
  ORDER BY w.week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter funil de vendas
CREATE OR REPLACE FUNCTION get_funil_vendas(
  p_periodo_inicio timestamp with time zone DEFAULT date_trunc('month', now()),
  p_periodo_fim timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  etapa text,
  quantidade bigint,
  valor_total numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.etapa_pipeline::text as etapa,
    COUNT(*)::bigint as quantidade,
    COALESCE(SUM(v.valor_estimado), 0) as valor_total
  FROM vendas v
  WHERE v.created_at BETWEEN p_periodo_inicio AND p_periodo_fim
    AND v.status NOT IN ('cancelado', 'rejeitado')
  GROUP BY v.etapa_pipeline
  ORDER BY 
    CASE v.etapa_pipeline
      WHEN 'prospeccao' THEN 1
      WHEN 'qualificacao' THEN 2
      WHEN 'proposta' THEN 3
      WHEN 'negociacao' THEN 4
      WHEN 'fechamento' THEN 5
      WHEN 'ganho' THEN 6
      WHEN 'perdido' THEN 7
      ELSE 8
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;