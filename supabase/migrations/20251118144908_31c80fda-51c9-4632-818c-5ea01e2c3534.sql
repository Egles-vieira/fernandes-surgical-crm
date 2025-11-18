-- Alterar campo faturamento_parcial para usar enum yes_no
ALTER TABLE vendas 
DROP COLUMN IF EXISTS faturamento_parcial;

ALTER TABLE vendas 
ADD COLUMN faturamento_parcial yes_no DEFAULT 'NO';