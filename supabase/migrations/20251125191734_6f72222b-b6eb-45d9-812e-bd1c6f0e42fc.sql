-- Adicionar campo venda_id à tabela de propostas para vincular com vendas
ALTER TABLE whatsapp_propostas_comerciais 
ADD COLUMN IF NOT EXISTS venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL;

-- Adicionar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_propostas_venda_id 
ON whatsapp_propostas_comerciais(venda_id);