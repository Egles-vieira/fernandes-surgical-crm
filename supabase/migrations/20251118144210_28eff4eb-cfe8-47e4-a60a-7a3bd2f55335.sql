-- Adicionar campo faturamento_parcial na tabela vendas
ALTER TABLE vendas ADD COLUMN faturamento_parcial boolean DEFAULT false;

-- Adicionar campo codigo_estabelecimento na tabela empresas
ALTER TABLE empresas ADD COLUMN codigo_estabelecimento varchar(100);