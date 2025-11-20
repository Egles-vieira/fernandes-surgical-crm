-- ============================================
-- FASE 1: Preparação do Banco de Dados
-- Busca Semântica por Embeddings
-- ============================================

-- Etapa 1.1: Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Etapa 1.2: Adicionar coluna de embedding na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

COMMENT ON COLUMN public.produtos.embedding IS 
'Vetor semântico gerado por text-embedding-3-small (OpenAI) para busca por similaridade';

-- Etapa 1.3: Criar índice HNSW para busca vetorial rápida
CREATE INDEX IF NOT EXISTS produtos_embedding_idx 
ON public.produtos 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Etapa 1.4: Criar função RPC para busca semântica
CREATE OR REPLACE FUNCTION match_produtos (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  referencia_interna varchar(50),
  nome text,
  narrativa text,
  preco_venda numeric,
  quantidade_em_maos numeric,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.referencia_interna,
    p.nome,
    p.narrativa,
    p.preco_venda,
    p.quantidade_em_maos,
    (1 - (p.embedding <=> query_embedding)) as similarity
  FROM public.produtos p
  WHERE 
    p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) > match_threshold
    AND p.quantidade_em_maos > 0
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_produtos IS 
'Busca produtos por similaridade semântica usando embeddings. Retorna apenas produtos em estoque acima do threshold de similaridade.';