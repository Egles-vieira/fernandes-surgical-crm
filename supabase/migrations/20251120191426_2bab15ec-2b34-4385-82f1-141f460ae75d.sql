-- Adicionar coluna para ativar/desativar agente de vendas por conta WhatsApp
ALTER TABLE whatsapp_contas 
ADD COLUMN IF NOT EXISTS agente_vendas_ativo boolean DEFAULT false;

COMMENT ON COLUMN whatsapp_contas.agente_vendas_ativo IS 'Define se o agente de vendas automático está ativo para esta conta';