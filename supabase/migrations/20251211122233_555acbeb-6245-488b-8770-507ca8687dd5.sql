-- Dropar a função existente com a assinatura específica
DROP FUNCTION IF EXISTS public.get_vendas_pipeline_paginado(jsonb, integer);

-- Recriar a função com cast explícito de etapa_pipeline para TEXT
CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_limites_por_etapa jsonb DEFAULT '{"prospeccao":20,"qualificacao":20,"proposta":20,"negociacao":20,"followup_cliente":20,"fechamento":20}'::jsonb,
  p_dias_atras integer DEFAULT 90
)
RETURNS TABLE (
  id uuid,
  numero_venda text,
  cliente_id uuid,
  cliente_nome text,
  valor_estimado numeric,
  probabilidade integer,
  etapa_pipeline text,
  data_previsao_fechamento date,
  created_at timestamptz,
  vendedor_nome text,
  total_itens bigint,
  valor_total_etapa numeric,
  valor_potencial_etapa numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_data_limite timestamptz := now() - (p_dias_atras || ' days')::interval;
BEGIN
  RETURN QUERY
  WITH vendas_com_totais AS (
    SELECT 
      v.id,
      v.numero_venda,
      v.cliente_id,
      COALESCE(c.nome_abrev, c.nome_emit, 'Cliente não informado') as cliente_nome,
      COALESCE(v.valor_final, v.valor_total, 0)::numeric as valor_estimado,
      COALESCE(v.probabilidade, 50) as probabilidade,
      v.etapa_pipeline::TEXT as etapa_pipeline,
      v.data_previsao_fechamento,
      v.created_at,
      COALESCE(p.primeiro_nome || ' ' || p.sobrenome, p.primeiro_nome, 'Vendedor') as vendedor_nome,
      (SELECT COUNT(*) FROM vendas_itens vi WHERE vi.venda_id = v.id) as total_itens,
      SUM(COALESCE(v.valor_final, v.valor_total, 0)) OVER (PARTITION BY v.etapa_pipeline) as valor_total_etapa,
      SUM(COALESCE(v.valor_final, v.valor_total, 0) * COALESCE(v.probabilidade, 50) / 100.0) OVER (PARTITION BY v.etapa_pipeline) as valor_potencial_etapa,
      ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN perfis_usuario p ON p.id = v.vendedor_id
    WHERE v.created_at >= v_data_limite
      AND v.etapa_pipeline IS NOT NULL
      AND v.etapa_pipeline NOT IN ('ganho', 'perdido')
      AND (
        -- Vendedor da venda
        v.vendedor_id = v_user_id
        -- Criador da venda
        OR v.user_id = v_user_id
        -- Vendedor do cliente
        OR c.vendedor_id = v_user_id
        -- Admin ou gerente
        OR auth_is_admin()
        OR auth_is_manager()
        -- Membro da equipe do cliente
        OR EXISTS (
          SELECT 1 FROM membros_equipe me 
          WHERE me.equipe_id = c.equipe_id 
          AND me.usuario_id = v_user_id
        )
      )
  )
  SELECT 
    vct.id,
    vct.numero_venda,
    vct.cliente_id,
    vct.cliente_nome,
    vct.valor_estimado,
    vct.probabilidade,
    vct.etapa_pipeline::TEXT as etapa_pipeline,
    vct.data_previsao_fechamento,
    vct.created_at,
    vct.vendedor_nome,
    vct.total_itens,
    vct.valor_total_etapa,
    vct.valor_potencial_etapa
  FROM vendas_com_totais vct
  WHERE vct.rn <= COALESCE((p_limites_por_etapa->>vct.etapa_pipeline)::int, 20)
  ORDER BY vct.etapa_pipeline, vct.created_at DESC;
END;
$$;