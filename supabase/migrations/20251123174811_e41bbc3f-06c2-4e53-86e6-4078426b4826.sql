-- Atualiza a função match_produtos_hibrido para buscar palavras individuais
CREATE OR REPLACE FUNCTION match_produtos_hibrido(
  query_embedding vector(1536),
  query_text text,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  referencia_interna text,
  nome text,
  descricao text,
  preco_venda numeric,
  quantidade_em_maos numeric,
  unidade text,
  similarity float,
  match_type text
)
LANGUAGE plpgsql
AS $$
DECLARE
  palavras text[];
  total_palavras int;
  min_palavras_match int;
BEGIN
  -- Dividir query_text em palavras (remover palavras muito curtas)
  SELECT array_agg(palavra)
  INTO palavras
  FROM (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS palavra
  ) sub
  WHERE length(palavra) > 2;
  
  total_palavras := COALESCE(array_length(palavras, 1), 0);
  min_palavras_match := GREATEST(1, CEIL(total_palavras * 0.7)); -- Pelo menos 70% das palavras
  
  RETURN QUERY
  WITH semantic_matches AS (
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.descricao,
      p.preco_venda,
      p.quantidade_em_maos,
      p.unidade,
      1 - (p.embedding <=> query_embedding) as similarity,
      'semantic'::text as match_type
    FROM produtos p
    WHERE 
      p.embedding IS NOT NULL
      AND p.quantidade_em_maos > 0
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count
  ),
  text_matches AS (
    SELECT 
      p.id,
      p.referencia_interna,
      p.nome,
      p.descricao,
      p.preco_venda,
      p.quantidade_em_maos,
      p.unidade,
      0.95::float as similarity,
      'text'::text as match_type,
      (
        SELECT COUNT(DISTINCT palavra)
        FROM unnest(palavras) palavra
        WHERE 
          lower(p.nome) LIKE '%' || palavra || '%' OR 
          lower(p.referencia_interna) LIKE '%' || palavra || '%'
      ) as palavras_encontradas
    FROM produtos p
    WHERE 
      p.quantidade_em_maos > 0
      AND total_palavras > 0
    HAVING 
      (
        SELECT COUNT(DISTINCT palavra)
        FROM unnest(palavras) palavra
        WHERE 
          lower(p.nome) LIKE '%' || palavra || '%' OR 
          lower(p.referencia_interna) LIKE '%' || palavra || '%'
      ) >= min_palavras_match
    ORDER BY palavras_encontradas DESC
    LIMIT match_count
  )
  SELECT DISTINCT ON (t.id)
    t.id,
    t.referencia_interna,
    t.nome,
    t.descricao,
    t.preco_venda,
    t.quantidade_em_maos,
    t.unidade,
    t.similarity,
    t.match_type
  FROM (
    SELECT * FROM text_matches
    UNION ALL
    SELECT * FROM semantic_matches
  ) t
  ORDER BY t.id, t.similarity DESC
  LIMIT match_count;
END;
$$;