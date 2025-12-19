-- Adicionar campo cliente_id na tabela oportunidades para vinculação direta
ALTER TABLE oportunidades 
ADD COLUMN cliente_id UUID REFERENCES clientes(id);

-- Criar índice para performance
CREATE INDEX idx_oportunidades_cliente_id ON oportunidades(cliente_id);

-- Adicionar campos denormalizados para exibição rápida
ALTER TABLE oportunidades 
ADD COLUMN cliente_nome TEXT,
ADD COLUMN cliente_cnpj TEXT;