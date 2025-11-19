-- Criar constraint única para evitar itens duplicados (venda_id + sequencia_item)
ALTER TABLE vendas_itens 
ADD CONSTRAINT vendas_itens_venda_sequencia_unique 
UNIQUE (venda_id, sequencia_item)