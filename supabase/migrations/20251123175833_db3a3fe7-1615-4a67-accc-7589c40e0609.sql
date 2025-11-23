-- Corrigir função match_produtos_hibrido com sintaxe correta do unnest
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
  quantidade_em_maos integer,
  similarity float,
  match_type text
)
LANGUAGE plpgsql
AS $$
DECLARE
  words text[];
  min_word_matches int;
BEGIN
  -- Dividir o texto em palavras e filtrar palavras curtas (< 3 chars)
  words := regexp_split_to_array(lower(trim(query_text)), '\s+');
  words := array_remove(words, '');
  
  -- Filtrar palavras com menos de 3 caracteres usando unnest corretamente
  words := ARRAY(
    SELECT w 
    FROM unnest(words) w 
    WHERE length(w) >= 3
  );
  
  -- Se não há palavras válidas, fazer só busca vetorial
  IF array_length(words, 1) IS NULL OR array_length(words, 1) = 0 THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      (1 - (p.embedding <=> query_embedding))::float as similarity,
      'semantic'::text as match_type
    FROM produtos p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) >= match_threshold
      AND p.quantidade_em_maos > 0
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
    RETURN;
  END IF;
  
  -- Calcular quantas palavras precisam dar match (70% das palavras)
  min_word_matches := GREATEST(1, CEIL(array_length(words, 1) * 0.7)::int);
  
  -- Busca Híbrida: texto (70% palavras) + vetorial
  RETURN QUERY
  WITH text_matches AS (
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      0.0::float as similarity,
      'text'::text as match_type,
      -- Contar quantas palavras aparecem no nome ou referência
      (
        SELECT COUNT(*)::int
        FROM unnest(words) w
        WHERE 
          lower(p.nome) LIKE '%' || w || '%' OR 
          lower(p.referencia_interna) LIKE '%' || w || '%'
      ) as word_matches
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
  ),
  semantic_matches AS (
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.narrativa,
      p.preco_venda,
      p.quantidade_em_maos,
      (1 - (p.embedding <=> query_embedding))::float as similarity,
      'semantic'::text as match_type
    FROM produtos p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) >= match_threshold
      AND p.quantidade_em_maos > 0
  ),
  combined AS (
    -- Produtos que deram match por texto (70% palavras)
    SELECT DISTINCT ON (id)
      id, referencia_interna, nome, narrativa, preco_venda, 
      quantidade_em_maos, similarity, match_type
    FROM text_matches
    WHERE word_matches >= min_word_matches
    
    UNION
    
    -- Produtos que deram match semântico
    SELECT 
      id, referencia_interna, nome, narrativa, preco_venda, 
      quantidade_em_maos, similarity, match_type
    FROM semantic_matches
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