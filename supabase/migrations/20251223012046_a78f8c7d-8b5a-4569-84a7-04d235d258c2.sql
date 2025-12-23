
-- Primeiro remove a função existente
DROP FUNCTION IF EXISTS public.match_produtos_hibrido(TEXT, vector, FLOAT, INT);
DROP FUNCTION IF EXISTS public.match_produtos_hibrido(TEXT, vector, DOUBLE PRECISION, INT);

-- Recria com score baseado no número de matches
CREATE OR REPLACE FUNCTION public.match_produtos_hibrido(
  query_text TEXT,
  query_embedding vector(1536) DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  referencia_interna TEXT,
  preco_venda NUMERIC,
  quantidade_em_maos NUMERIC,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_words TEXT[];
  word_count INT;
BEGIN
  -- Normaliza e extrai palavras da busca
  search_words := regexp_split_to_array(
    lower(unaccent(trim(query_text))), 
    '\s+'
  );
  word_count := array_length(search_words, 1);
  
  -- Se não há palavras válidas, retorna vazio
  IF word_count IS NULL OR word_count = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH text_matches AS (
    SELECT 
      p.id,
      p.nome,
      p.referencia_interna,
      p.preco_venda,
      p.quantidade_em_maos,
      -- Score baseado na proporção de palavras encontradas (não mais 1.0 fixo)
      (
        SELECT COUNT(*)::FLOAT / word_count
        FROM unnest(search_words) AS sw
        WHERE lower(unaccent(p.nome)) LIKE '%' || sw || '%'
           OR lower(unaccent(COALESCE(p.referencia_interna, ''))) LIKE '%' || sw || '%'
      ) AS similarity
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
      AND (
        -- Verifica se pelo menos 70% das palavras estão presentes
        SELECT COUNT(*)::FLOAT / word_count >= match_threshold
        FROM unnest(search_words) AS sw
        WHERE lower(unaccent(p.nome)) LIKE '%' || sw || '%'
           OR lower(unaccent(COALESCE(p.referencia_interna, ''))) LIKE '%' || sw || '%'
      )
  ),
  semantic_matches AS (
    SELECT 
      p.id,
      p.nome,
      p.referencia_interna,
      p.preco_venda,
      p.quantidade_em_maos,
      1 - (p.embedding <=> query_embedding) AS similarity
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
      AND p.embedding IS NOT NULL
      AND query_embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) >= match_threshold
  ),
  combined AS (
    SELECT * FROM text_matches
    UNION
    SELECT * FROM semantic_matches
  )
  SELECT 
    c.id,
    c.nome,
    c.referencia_interna,
    c.preco_venda,
    c.quantidade_em_maos,
    MAX(c.similarity) AS similarity
  FROM combined c
  GROUP BY c.id, c.nome, c.referencia_interna, c.preco_venda, c.quantidade_em_maos
  ORDER BY MAX(c.similarity) DESC, c.nome ASC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_produtos_hibrido IS 
'Busca híbrida de produtos com score proporcional ao número de palavras encontradas. 
Produtos com mais matches recebem score maior (ex: 4/4 palavras = 1.0, 3/4 = 0.75).';
