-- Drop e recria match_produtos_hibrido com colunas corretas do schema produtos
DROP FUNCTION IF EXISTS public.match_produtos_hibrido(text, vector, double precision, integer);

CREATE OR REPLACE FUNCTION public.match_produtos_hibrido(
  query_text text,
  query_embedding vector DEFAULT NULL,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  referencia_interna text,
  nome text,
  narrativa text,
  custo numeric,
  unidade_medida text,
  grupo_estoque text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_query text;
  word_count integer;
BEGIN
  -- Normaliza a query (lowercase, trim)
  normalized_query := lower(trim(query_text));
  
  -- Conta palavras para scoring
  SELECT array_length(regexp_split_to_array(normalized_query, '\s+'), 1) INTO word_count;
  IF word_count IS NULL OR word_count = 0 THEN
    word_count := 1;
  END IF;

  RETURN QUERY
  WITH query_words AS (
    SELECT unnest(regexp_split_to_array(normalized_query, '\s+')) AS word
  ),
  scored_products AS (
    SELECT 
      p.id,
      p.referencia_interna::text AS referencia_interna,
      p.nome::text AS nome,
      p.narrativa::text AS narrativa,
      p.custo,
      p.unidade_medida::text AS unidade_medida,
      p.grupo_estoque::text AS grupo_estoque,
      -- Score baseado em matches de palavras
      (
        SELECT COUNT(*)::double precision / word_count::double precision
        FROM query_words qw
        WHERE 
          lower(p.nome::text) LIKE '%' || qw.word || '%'
          OR lower(p.referencia_interna::text) LIKE '%' || qw.word || '%'
          OR lower(COALESCE(p.narrativa::text, '')) LIKE '%' || qw.word || '%'
      ) AS text_score
    FROM produtos p
  )
  SELECT 
    sp.id,
    sp.referencia_interna,
    sp.nome,
    sp.narrativa,
    sp.custo,
    sp.unidade_medida,
    sp.grupo_estoque,
    sp.text_score AS similarity
  FROM scored_products sp
  WHERE sp.text_score >= match_threshold
  ORDER BY sp.text_score DESC, sp.nome ASC
  LIMIT match_count;
END;
$$;