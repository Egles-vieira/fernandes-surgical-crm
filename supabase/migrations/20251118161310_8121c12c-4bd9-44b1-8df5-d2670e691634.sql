-- Adicionar campo preco_tabela na tabela vendas_itens
ALTER TABLE vendas_itens 
ADD COLUMN preco_tabela numeric(15,2);