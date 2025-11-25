-- Drop the current version
DROP FUNCTION IF EXISTS match_produtos_hibrido(text, vector(1536), float, int);

-- Recreate with normalization to handle comma vs dot in numbers
CREATE OR REPLACE FUNCTION match_produtos_hibrido(
  query_text text,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  referencia_interna text,
  nome text,
  narrativa text,
  preco_venda numeric,
  quantidade_em_maos numeric,
  similarity float,
  match_type text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  words text[];
  word_count int;
  min_matches int;
  normalized_query text;
BEGIN
  -- Normalize: replace comma with dot for number matching (4,5 -> 4.5)
  normalized_query := replace(lower(trim(query_text)), ',', '.');
  
  -- Split search term into words
  words := string_to_array(normalized_query, ' ');
  word_count := array_length(words, 1);
  min_matches := GREATEST(1, CEIL(word_count * 0.7));

  RETURN QUERY
  WITH text_matches AS (
    SELECT 
      p.id,
      p.referencia_interna::text,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      1.0::float as similarity,
      'text'::text as match_type
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
      AND (
        SELECT COUNT(*)
        FROM unnest(words) w
        WHERE lower(p.nome) LIKE '%' || w || '%'
           OR lower(p.referencia_interna::text) LIKE '%' || w || '%'
      ) >= min_matches
  ),
  semantic_matches AS (
    SELECT 
      p.id,
      p.referencia_interna::text,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      (1 - (p.embedding <=> query_embedding))::float as similarity,
      'semantic'::text as match_type
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
      AND p.embedding IS NOT NULL
      AND (1 - (p.embedding <=> query_embedding)) > match_threshold
  ),
  combined AS (
    SELECT * FROM text_matches
    UNION
    SELECT * FROM semantic_matches
  )
  SELECT DISTINCT ON (c.id)
    c.id,
    c.referencia_interna,
    c.nome,
    c.narrativa,
    c.preco_venda,
    c.quantidade_em_maos,
    c.similarity,
    c.match_type
  FROM combined c
  ORDER BY c.id, c.similarity DESC
  LIMIT match_count;
END;
$$;