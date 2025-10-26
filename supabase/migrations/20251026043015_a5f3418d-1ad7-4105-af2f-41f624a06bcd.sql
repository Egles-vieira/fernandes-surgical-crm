-- Habilitar extensão unaccent se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Função para busca por similaridade simples usando pg_trgm
CREATE OR REPLACE FUNCTION buscar_produtos_similares(
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
    SELECT 
      lower(unaccent(p_descricao)) as termo_busca
  ),
  busca_trigram AS (
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
      ) as score_similaridade
    FROM produtos p, termos_normalizados
    WHERE p.quantidade_em_maos > 0
      AND (
        lower(unaccent(p.nome)) % termo_busca OR
        lower(unaccent(COALESCE(p.narrativa, ''))) % termo_busca OR
        lower(unaccent(COALESCE(p.referencia_interna, ''))) % termo_busca
      )
  )
  SELECT *
  FROM busca_trigram
  WHERE score_similaridade >= p_similaridade_minima
  ORDER BY score_similaridade DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public;

-- Função híbrida para busca com texto e números
CREATE OR REPLACE FUNCTION buscar_produtos_hibrido(
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
      ) as score_texto_raw
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
      CASE 
        WHEN p_numeros IS NULL OR array_length(p_numeros, 1) = 0 THEN 0.5
        ELSE (
          SELECT COUNT(*)::REAL / GREATEST(array_length(p_numeros, 1), 1)
          FROM unnest(p_numeros) num
          WHERE p.nome ~* num OR COALESCE(p.narrativa, '') ~* num OR COALESCE(p.referencia_interna, '') ~* num
        )
      END as score_numeros_raw
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
    (COALESCE(bt.score_texto_raw, 0) * 0.7 + COALESCE(bn.score_numeros_raw, 0) * 0.3) as score_total,
    bt.score_texto_raw as score_texto,
    bn.score_numeros_raw as score_numeros
  FROM produtos p
  LEFT JOIN busca_texto bt ON bt.id = p.id
  LEFT JOIN busca_numeros bn ON bn.id = p.id
  WHERE p.quantidade_em_maos > 0
    AND (bt.score_texto_raw > 0.15 OR bn.score_numeros_raw > 0.3)
  ORDER BY score_total DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public;

-- Comentários para documentação
COMMENT ON FUNCTION buscar_produtos_similares IS 'Busca produtos usando pg_trgm similarity operator (%) com score de 0.0 a 1.0. Usa índices GIN existentes em produtos.nome e produtos.narrativa';
COMMENT ON FUNCTION buscar_produtos_hibrido IS 'Busca híbrida combinando similaridade de texto (70%) e match de números (30%). Usa índices GIN existentes para performance';