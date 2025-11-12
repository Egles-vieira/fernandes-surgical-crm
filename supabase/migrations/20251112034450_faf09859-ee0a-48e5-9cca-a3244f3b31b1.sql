-- ============================================
-- FASE 7: Criar funções RPC para Dashboard de Metas
-- ============================================

-- Remover funções existentes se houver
DROP FUNCTION IF EXISTS get_kpis_gerais_periodo(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_pacing_semanal(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_funil_vendas(TIMESTAMPTZ, TIMESTAMPTZ);

-- Função para obter KPIs gerais do período
CREATE FUNCTION get_kpis_gerais_periodo(
  p_data_inicio TIMESTAMPTZ,
  p_data_fim TIMESTAMPTZ
)
RETURNS TABLE (
  total_meta NUMERIC,
  total_realizado NUMERIC,
  percentual_atingimento NUMERIC,
  pacing NUMERIC,
  numero_equipes BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH metas_periodo AS (
    -- Somar metas de equipes ativas no período
    SELECT 
      COALESCE(SUM(me.valor_objetivo), 0) as meta_total,
      COALESCE(SUM(me.valor_atual), 0) as realizado_total,
      COUNT(DISTINCT me.equipe_id) as total_equipes
    FROM metas_equipe me
    WHERE me.status = 'ativa'
      AND me.periodo_inicio <= p_data_fim
      AND me.periodo_fim >= p_data_inicio
  ),
  dias_info AS (
    SELECT 
      EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio)) / 86400.0 as dias_totais,
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p_data_inicio)) / 86400.0 as dias_passados
  )
  SELECT 
    mp.meta_total as total_meta,
    mp.realizado_total as total_realizado,
    CASE 
      WHEN mp.meta_total > 0 THEN (mp.realizado_total / mp.meta_total * 100)
      ELSE 0
    END as percentual_atingimento,
    CASE 
      WHEN di.dias_totais > 0 AND mp.meta_total > 0 THEN 
        ((mp.realizado_total / mp.meta_total) / (di.dias_passados / di.dias_totais) * 100)
      ELSE 0
    END as pacing,
    mp.total_equipes as numero_equipes
  FROM metas_periodo mp
  CROSS JOIN dias_info di;
END;
$$;

-- Função para obter pacing semanal
CREATE FUNCTION get_pacing_semanal(
  p_periodo_inicio TIMESTAMPTZ,
  p_periodo_fim TIMESTAMPTZ
)
RETURNS TABLE (
  semana TEXT,
  data_semana TEXT,
  realizado NUMERIC,
  meta NUMERIC,
  projecao NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH semanas AS (
    SELECT 
      date_trunc('week', d)::DATE as inicio_semana,
      'Semana ' || EXTRACT(WEEK FROM d)::TEXT as nome_semana
    FROM generate_series(
      date_trunc('week', p_periodo_inicio::DATE),
      p_periodo_fim::DATE,
      '1 week'::INTERVAL
    ) AS d
  ),
  vendas_por_semana AS (
    SELECT 
      date_trunc('week', v.data_aprovacao)::DATE as semana,
      SUM(v.valor_final) as valor_vendas
    FROM vendas v
    WHERE v.status = 'aprovada'
      AND v.data_aprovacao >= p_periodo_inicio
      AND v.data_aprovacao <= p_periodo_fim
    GROUP BY date_trunc('week', v.data_aprovacao)
  ),
  meta_semanal AS (
    SELECT 
      COALESCE(SUM(me.valor_objetivo), 0) / 
      NULLIF(EXTRACT(EPOCH FROM (p_periodo_fim - p_periodo_inicio)) / 604800.0, 0) as meta_por_semana
    FROM metas_equipe me
    WHERE me.status = 'ativa'
      AND me.periodo_inicio <= p_periodo_fim
      AND me.periodo_fim >= p_periodo_inicio
  )
  SELECT 
    s.nome_semana as semana,
    s.inicio_semana::TEXT as data_semana,
    COALESCE(vps.valor_vendas, 0) as realizado,
    COALESCE(ms.meta_por_semana, 0) as meta,
    COALESCE(vps.valor_vendas, 0) * 
      CASE 
        WHEN s.inicio_semana >= CURRENT_DATE THEN 1.1
        ELSE 1.0
      END as projecao
  FROM semanas s
  CROSS JOIN meta_semanal ms
  LEFT JOIN vendas_por_semana vps ON vps.semana = s.inicio_semana
  ORDER BY s.inicio_semana;
END;
$$;

-- Função para obter funil de vendas
CREATE FUNCTION get_funil_vendas(
  p_periodo_inicio TIMESTAMPTZ,
  p_periodo_fim TIMESTAMPTZ
)
RETURNS TABLE (
  etapa TEXT,
  quantidade BIGINT,
  valor_total NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(v.status, 'indefinido')::TEXT as etapa,
    COUNT(*)::BIGINT as quantidade,
    COALESCE(SUM(v.valor_final), 0)::NUMERIC as valor_total
  FROM vendas v
  WHERE v.criado_em >= p_periodo_inicio
    AND v.criado_em <= p_periodo_fim
  GROUP BY v.status
  ORDER BY 
    CASE v.status
      WHEN 'prospeccao' THEN 1
      WHEN 'qualificacao' THEN 2
      WHEN 'proposta' THEN 3
      WHEN 'negociacao' THEN 4
      WHEN 'aprovada' THEN 5
      WHEN 'perdida' THEN 6
      ELSE 7
    END;
END;
$$;