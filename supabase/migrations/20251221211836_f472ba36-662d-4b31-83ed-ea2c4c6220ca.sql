-- Dropar a materialized view que depende de preco_venda
DROP MATERIALIZED VIEW IF EXISTS mv_produtos_resumo;

-- Alterar precisão do campo preco_venda de 2 para 5 casas decimais
ALTER TABLE public.produtos 
ALTER COLUMN preco_venda TYPE NUMERIC(15,5);

-- Recriar a materialized view
CREATE MATERIALIZED VIEW mv_produtos_resumo AS
SELECT 
    count(*) AS total_produtos,
    count(*) AS produtos_ativos,
    count(*) FILTER (WHERE COALESCE(quantidade_em_maos, 0::numeric) > 0::numeric) AS com_estoque,
    count(*) FILTER (WHERE COALESCE(quantidade_em_maos, 0::numeric) <= 0::numeric) AS sem_estoque,
    count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
    COALESCE(sum(COALESCE(quantidade_em_maos, 0::numeric) * COALESCE(preco_venda, 0::numeric)), 0::numeric) AS valor_estoque,
    CASE
        WHEN count(*) > 0 THEN round(count(*) FILTER (WHERE embedding IS NOT NULL)::numeric / count(*)::numeric * 100::numeric)
        ELSE 0::numeric
    END AS taxa_embedding,
    now() AS atualizado_em
FROM produtos;