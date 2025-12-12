
-- Primeiro dropar a função existente
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(JSONB, INT);

-- Recriar com valor_total ao invés de valor_estimado
CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa JSONB DEFAULT '{}',
  p_dias_atras INT DEFAULT 365
)
RETURNS TABLE (
  id UUID,
  numero_venda TEXT,
  cliente_id UUID,
  cliente_nome TEXT,
  etapa_pipeline TEXT,
  valor_estimado NUMERIC,
  probabilidade INTEGER,
  created_at TIMESTAMPTZ,
  data_fechamento_prevista TIMESTAMPTZ,
  vendedor_nome TEXT,
  total_itens BIGINT,
  total_etapa BIGINT,
  valor_total_etapa NUMERIC,
  valor_potencial_etapa NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH vendas_com_totais AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_id,
      c.nome_emit::TEXT as cliente_nome,
      v.etapa_pipeline::TEXT as etapa_pipeline,
      -- Usar valor_total que contém a soma real dos itens
      COALESCE(v.valor_total, 0) as valor_estimado,
      v.probabilidade,
      v.created_at,
      v.data_fechamento_prevista,
      p.nome_completo::TEXT as vendedor_nome,
      (SELECT COUNT(*) FROM vendas_itens vi WHERE vi.venda_id = v.id) as total_itens,
      COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_etapa,
      SUM(COALESCE(v.valor_total, 0)) OVER (PARTITION BY v.etapa_pipeline) as valor_total_etapa,
      SUM(COALESCE(v.valor_total, 0) * COALESCE(v.probabilidade, 0) / 100.0) OVER (PARTITION BY v.etapa_pipeline) as valor_potencial_etapa,
      ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN perfis_usuario p ON p.id = v.vendedor_id
    WHERE 
      (v.created_at >= (CURRENT_DATE - p_dias_atras * INTERVAL '1 day') 
       OR v.status NOT IN ('cancelado', 'ganho', 'perdido'))
      AND v.etapa_pipeline IS NOT NULL
      AND v.status != 'cancelado'
  )
  SELECT 
    vct.id,
    vct.numero_venda,
    vct.cliente_id,
    vct.cliente_nome,
    vct.etapa_pipeline,
    vct.valor_estimado,
    vct.probabilidade,
    vct.created_at,
    vct.data_fechamento_prevista,
    vct.vendedor_nome,
    vct.total_itens,
    vct.total_etapa,
    vct.valor_total_etapa,
    vct.valor_potencial_etapa
  FROM vendas_com_totais vct
  WHERE vct.rn <= COALESCE((p_limites_por_etapa->>vct.etapa_pipeline)::int, 20)
  ORDER BY vct.etapa_pipeline, vct.created_at DESC;
END;
$$;
