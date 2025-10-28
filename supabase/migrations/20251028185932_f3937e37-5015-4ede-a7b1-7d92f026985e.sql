-- Otimizações de performance - Criação de índices estratégicos

-- Índice composto para cotações filtradas por plataforma e status
CREATE INDEX IF NOT EXISTS idx_cotacoes_plataforma_status 
ON edi_cotacoes(plataforma_id, step_atual, status_analise_ia)
WHERE step_atual IS NOT NULL;

-- Índice para itens de cotação com status de análise
CREATE INDEX IF NOT EXISTS idx_itens_cotacao_status 
ON edi_cotacoes_itens(cotacao_id, status, analisado_por_ia);

-- Índice para busca full-text em produtos (português)
CREATE INDEX IF NOT EXISTS idx_produtos_busca_gin 
ON produtos USING gin(to_tsvector('portuguese', nome || ' ' || COALESCE(narrativa, '') || ' ' || COALESCE(referencia_interna, '')));

-- Índice para vinculos de produtos EDI
CREATE INDEX IF NOT EXISTS idx_edi_produtos_vinculo_lookup
ON edi_produtos_vinculo(plataforma_id, codigo_produto_cliente);

-- Índice para sugestões de produtos por item
CREATE INDEX IF NOT EXISTS idx_itens_produtos_sugeridos
ON edi_cotacoes_itens USING gin(produtos_sugeridos_ia)
WHERE produtos_sugeridos_ia IS NOT NULL;