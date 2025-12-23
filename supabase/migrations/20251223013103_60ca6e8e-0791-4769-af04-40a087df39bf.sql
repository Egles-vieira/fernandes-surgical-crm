-- Dropa a função existente com assinatura diferente
DROP FUNCTION IF EXISTS public.match_produtos_hibrido(text, vector, double precision, integer);

-- Recria com casts explícitos para evitar erro 42804
CREATE OR REPLACE FUNCTION public.match_produtos_hibrido(
  query_text text,
  query_embedding vector DEFAULT NULL,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  nome text,
  referencia_interna text,
  codigo_barras text,
  preco_venda numeric,
  preco_custo numeric,
  quantidade_em_maos numeric,
  unidade text,
  ncm text,
  grupo_produto text,
  marca text,
  similarity double precision,
  narrativa text,
  match_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_query text;
  query_words text[];
  word_count int;
BEGIN
  -- Normaliza a query removendo acentos e convertendo para minúsculas
  normalized_query := lower(translate(query_text, 
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'));
  
  -- Divide a query em palavras
  query_words := string_to_array(normalized_query, ' ');
  word_count := array_length(query_words, 1);
  
  IF word_count IS NULL OR word_count = 0 THEN
    word_count := 1;
  END IF;

  RETURN QUERY
  WITH scored_products AS (
    SELECT 
      p.id,
      p.nome::text AS nome,
      p.referencia_interna::text AS referencia_interna,
      p.codigo_barras::text AS codigo_barras,
      p.preco_venda,
      p.preco_custo,
      p.quantidade_em_maos,
      p.unidade::text AS unidade,
      p.ncm::text AS ncm,
      p.grupo_produto::text AS grupo_produto,
      p.marca::text AS marca,
      p.narrativa::text AS narrativa,
      -- Calcula score baseado em quantas palavras da query aparecem no nome/referência/narrativa
      (
        SELECT COUNT(*)::double precision / word_count::double precision
        FROM unnest(query_words) AS word
        WHERE 
          lower(translate(COALESCE(p.nome, ''), 
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) ILIKE '%' || word || '%'
          OR lower(translate(COALESCE(p.referencia_interna, ''), 
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) ILIKE '%' || word || '%'
          OR lower(translate(COALESCE(p.narrativa, ''), 
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) ILIKE '%' || word || '%'
          OR lower(translate(COALESCE(p.marca, ''), 
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) ILIKE '%' || word || '%'
      ) AS text_similarity,
      -- Score por embedding (se fornecido)
      CASE 
        WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL 
        THEN 1 - (p.embedding <=> query_embedding)
        ELSE 0
      END AS vector_similarity
    FROM produtos p
    WHERE p.ativo = true
  )
  SELECT 
    sp.id,
    sp.nome,
    sp.referencia_interna,
    sp.codigo_barras,
    sp.preco_venda,
    sp.preco_custo,
    sp.quantidade_em_maos,
    sp.unidade,
    sp.ncm,
    sp.grupo_produto,
    sp.marca,
    -- Score combinado: prioriza texto, usa vetor como boost
    GREATEST(sp.text_similarity, sp.vector_similarity * 0.8)::double precision AS similarity,
    sp.narrativa,
    CASE 
      WHEN sp.text_similarity > 0 THEN 'text'::text
      WHEN sp.vector_similarity > 0 THEN 'vector'::text
      ELSE 'none'::text
    END AS match_type
  FROM scored_products sp
  WHERE sp.text_similarity >= match_threshold OR sp.vector_similarity >= match_threshold
  ORDER BY similarity DESC, sp.nome ASC
  LIMIT match_count;
END;
$$;