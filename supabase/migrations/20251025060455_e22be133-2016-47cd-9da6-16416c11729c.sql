-- Criar índices GIN para melhorar performance de busca textual
-- (pg_trgm já está instalado)

CREATE INDEX IF NOT EXISTS idx_produtos_nome_gin 
ON produtos USING GIN (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_produtos_narrativa_gin 
ON produtos USING GIN (narrativa gin_trgm_ops);

-- Índice para busca por produtos com estoque
CREATE INDEX IF NOT EXISTS idx_produtos_com_estoque 
ON produtos (quantidade_em_maos) 
WHERE quantidade_em_maos > 0;