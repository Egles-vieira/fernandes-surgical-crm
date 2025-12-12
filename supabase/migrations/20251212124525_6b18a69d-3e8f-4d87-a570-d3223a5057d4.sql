-- Drop and recreate get_vendas_pipeline_paginado with correct DATE type for data_fechamento_prevista
DROP FUNCTION IF EXISTS get_vendas_pipeline_paginado(JSONB);

CREATE OR REPLACE FUNCTION get_vendas_pipeline_paginado(p_limites_por_etapa JSONB DEFAULT '{}'::JSONB)
RETURNS TABLE (
    id UUID,
    numero_venda TEXT,
    cliente_nome TEXT,
    cliente_id UUID,
    valor_estimado NUMERIC,
    probabilidade INTEGER,
    etapa_pipeline TEXT,
    created_at TIMESTAMPTZ,
    data_fechamento_prevista DATE,
    vendedor_nome TEXT,
    total_itens BIGINT,
    total_real_etapa BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    etapa_key TEXT;
    etapa_limit INT;
BEGIN
    -- Create temp table with all accessible sales and row numbers per stage
    CREATE TEMP TABLE temp_vendas_pipeline ON COMMIT DROP AS
    WITH vendas_numeradas AS (
        SELECT 
            v.id,
            v.numero_venda,
            COALESCE(c.nome_fantasia, c.nome_emit, c.nome_abrev) as cliente_nome,
            v.cliente_id,
            COALESCE(v.valor_total, 0) as valor_estimado,
            COALESCE(v.probabilidade, 0) as probabilidade,
            v.etapa_pipeline::TEXT as etapa_pipeline,
            v.created_at,
            v.data_fechamento_prevista,
            p.nome_completo as vendedor_nome,
            COALESCE(
                (SELECT COUNT(*) FROM vendas_itens vi WHERE vi.venda_id = v.id),
                0
            ) as total_itens,
            ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn,
            COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_real_etapa
        FROM vendas v
        LEFT JOIN clientes c ON c.id = v.cliente_id
        LEFT JOIN perfis_usuario p ON p.id = v.vendedor_id
        WHERE v.excluido_em IS NULL
          AND (
              v.created_at >= NOW() - INTERVAL '365 days'
              OR v.etapa_pipeline NOT IN ('ganho', 'perdido', 'cancelado')
          )
    )
    SELECT * FROM vendas_numeradas;

    -- Return filtered results based on limits per stage
    RETURN QUERY
    SELECT 
        t.id,
        t.numero_venda,
        t.cliente_nome,
        t.cliente_id,
        t.valor_estimado,
        t.probabilidade,
        t.etapa_pipeline,
        t.created_at,
        t.data_fechamento_prevista,
        t.vendedor_nome,
        t.total_itens,
        t.total_real_etapa
    FROM temp_vendas_pipeline t
    WHERE t.rn <= COALESCE(
        (p_limites_por_etapa->>t.etapa_pipeline)::INT,
        20
    )
    ORDER BY t.etapa_pipeline, t.created_at DESC;
END;
$$;