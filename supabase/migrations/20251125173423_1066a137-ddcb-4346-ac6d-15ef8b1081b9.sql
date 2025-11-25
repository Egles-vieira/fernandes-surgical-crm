-- Drop existing function
DROP FUNCTION IF EXISTS match_produtos_hibrido(vector(1536), text, integer);

-- Recreate with improved ordering and scoring
CREATE OR REPLACE FUNCTION match_produtos_hibrido(
  query_embedding vector(1536),
  search_term text,
  match_count int DEFAULT 10
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
AS $$
DECLARE
  words text[];
  word_count int;
  min_matches int;
BEGIN
  -- Split search term into words
  words := string_to_array(lower(trim(search_term)), ' ');
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
      0.9::float as similarity,
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
      AND (1 - (p.embedding <=> query_embedding)) > 0.3
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
  ORDER BY c.id, c.similarity DESC, c.quantidade_em_maos DESC
  LIMIT match_count;
END;
$$;