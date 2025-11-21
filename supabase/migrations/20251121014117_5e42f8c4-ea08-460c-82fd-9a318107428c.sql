-- Função de Busca Híbrida: Combina busca por texto (ILIKE) com busca semântica (embeddings)
CREATE OR REPLACE FUNCTION match_produtos_hibrido(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  referencia_interna TEXT,
  nome TEXT,
  narrativa TEXT,
  preco_venda NUMERIC,
  quantidade_em_maos NUMERIC,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH combined_results AS (
    -- Busca por texto (ILIKE) - peso 0.4
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      0.7::FLOAT AS similarity, -- Score fixo alto para matches exatos
      1 AS match_type -- tipo 1 = match texto
    FROM produtos p
    WHERE 
      (p.nome ILIKE '%' || query_text || '%' OR 
       p.referencia_interna ILIKE '%' || query_text || '%')
      AND p.quantidade_em_maos > 0
    
    UNION
    
    -- Busca semântica (embeddings) - peso 0.6
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      (1 - (p.embedding <=> query_embedding))::FLOAT AS similarity,
      2 AS match_type -- tipo 2 = match semântico
    FROM produtos p
    WHERE 
      p.embedding IS NOT NULL 
      AND p.quantidade_em_maos > 0
      AND (1 - (p.embedding <=> query_embedding)) >= match_threshold
  )
  -- Agrupa resultados por produto e calcula score final
  SELECT DISTINCT ON (cr.id)
    cr.id,
    cr.referencia_interna,
    cr.nome,
    cr.narrativa,
    cr.preco_venda,
    cr.quantidade_em_maos,
    MAX(cr.similarity) AS similarity -- Pega o maior score (texto ou semântico)
  FROM combined_results cr
  GROUP BY cr.id, cr.referencia_interna, cr.nome, cr.narrativa, cr.preco_venda, cr.quantidade_em_maos
  ORDER BY cr.id, MAX(cr.similarity) DESC
  LIMIT match_count;
END;
$$;