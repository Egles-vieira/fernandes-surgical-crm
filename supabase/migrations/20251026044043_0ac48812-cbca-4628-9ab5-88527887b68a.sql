-- Corrigir tipos e retornos das funções pg_trgm com CASTs explícitos
CREATE OR REPLACE FUNCTION public.buscar_produtos_similares(
  p_descricao TEXT,
  p_limite INTEGER DEFAULT 300,
  p_similaridade_minima REAL DEFAULT 0.15
)
RETURNS TABLE (
  id UUID,
  referencia_interna VARCHAR,
  nome VARCHAR,
  preco_venda NUMERIC,
  unidade_medida VARCHAR,
  quantidade_em_maos NUMERIC,
  narrativa TEXT,
  score_similaridade REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH termos_normalizados AS (
    SELECT lower(unaccent(p_descricao)) AS termo_busca
  )
  SELECT 
    p.id,
    p.referencia_interna,
    p.nome,
    p.preco_venda,
    p.unidade_medida,
    p.quantidade_em_maos,
    p.narrativa,
    GREATEST(
      similarity(lower(unaccent(p.nome)), termo_busca),
      similarity(lower(unaccent(COALESCE(p.narrativa, ''))), termo_busca),
      similarity(lower(unaccent(COALESCE(p.referencia_interna, ''))), termo_busca)
    )::REAL AS score_similaridade
  FROM produtos p, termos_normalizados
  WHERE p.quantidade_em_maos > 0
    AND (
      lower(unaccent(p.nome)) % termo_busca OR
      lower(unaccent(COALESCE(p.narrativa, ''))) % termo_busca OR
      lower(unaccent(COALESCE(p.referencia_interna, ''))) % termo_busca
    )
  AND GREATEST(
      similarity(lower(unaccent(p.nome)), termo_busca),
      similarity(lower(unaccent(COALESCE(p.narrativa, ''))), termo_busca),
      similarity(lower(unaccent(COALESCE(p.referencia_interna, ''))), termo_busca)
    ) >= p_similaridade_minima
  ORDER BY score_similaridade DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public;

CREATE OR REPLACE FUNCTION public.buscar_produtos_hibrido(
  p_descricao TEXT,
  p_numeros TEXT[] DEFAULT NULL,
  p_limite INTEGER DEFAULT 300
)
RETURNS TABLE (
  id UUID,
  referencia_interna VARCHAR,
  nome VARCHAR,
  preco_venda NUMERIC,
  unidade_medida VARCHAR,
  quantidade_em_maos NUMERIC,
  narrativa TEXT,
  score_total REAL,
  score_texto REAL,
  score_numeros REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH busca_texto AS (
    SELECT 
      p.id,
      GREATEST(
        similarity(lower(unaccent(p.nome)), lower(unaccent(p_descricao))),
        similarity(lower(unaccent(COALESCE(p.narrativa, ''))), lower(unaccent(p_descricao)))
      )::REAL AS score_texto_raw
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
      AND (
        lower(unaccent(p.nome)) % lower(unaccent(p_descricao)) OR
        lower(unaccent(COALESCE(p.narrativa, ''))) % lower(unaccent(p_descricao))
      )
  ),
  busca_numeros AS (
    SELECT 
      p.id,
      (
        CASE 
          WHEN p_numeros IS NULL OR array_length(p_numeros, 1) = 0 THEN 0.5::REAL
          ELSE (
            SELECT COUNT(*)::REAL / GREATEST(array_length(p_numeros, 1)::REAL, 1.0::REAL)
            FROM unnest(p_numeros) num
            WHERE p.nome ~* num OR COALESCE(p.narrativa, '') ~* num OR COALESCE(p.referencia_interna, '') ~* num
          )
        END
      )::REAL AS score_numeros_raw
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
  )
  SELECT 
    p.id,
    p.referencia_interna,
    p.nome,
    p.preco_venda,
    p.unidade_medida,
    p.quantidade_em_maos,
    p.narrativa,
    (COALESCE(bt.score_texto_raw, 0.0::REAL) * 0.7::REAL + COALESCE(bn.score_numeros_raw, 0.0::REAL) * 0.3::REAL)::REAL AS score_total,
    COALESCE(bt.score_texto_raw, 0.0::REAL) AS score_texto,
    COALESCE(bn.score_numeros_raw, 0.0::REAL) AS score_numeros
  FROM produtos p
  LEFT JOIN busca_texto bt ON bt.id = p.id
  LEFT JOIN busca_numeros bn ON bn.id = p.id
  WHERE p.quantidade_em_maos > 0
    AND (COALESCE(bt.score_texto_raw, 0.0::REAL) > 0.15::REAL OR COALESCE(bn.score_numeros_raw, 0.0::REAL) > 0.3::REAL)
  ORDER BY score_total DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public;