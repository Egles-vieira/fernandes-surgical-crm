-- Adicionar campo sequencia_item na tabela vendas_itens
ALTER TABLE vendas_itens 
ADD COLUMN sequencia_item integer;

-- Atualizar registros existentes com sequência baseada na ordem de criação
UPDATE vendas_itens 
SET sequencia_item = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY venda_id ORDER BY created_at) as row_num
  FROM vendas_itens
) sub
WHERE vendas_itens.id = sub.id;