-- Adicionar colunas para integração Gupshup
ALTER TABLE public.whatsapp_contas 
ADD COLUMN IF NOT EXISTS app_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);