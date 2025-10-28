-- Adicionar índices para otimizar carregamento de cotações detalhadas

-- Índice composto para buscar itens de uma cotação ordenados
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_cotacao_numero 
ON edi_cotacoes_itens(cotacao_id, numero_item);

-- Índice para foreign key produto_id (acelera joins)
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_produto_id 
ON edi_cotacoes_itens(produto_id) 
WHERE produto_id IS NOT NULL;

-- Índice para foreign key produto_selecionado_id (acelera joins)
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_produto_selecionado 
ON edi_cotacoes_itens(produto_selecionado_id) 
WHERE produto_selecionado_id IS NOT NULL;