-- Adicionar campo de validade da proposta
ALTER TABLE vendas
ADD COLUMN validade_proposta date;