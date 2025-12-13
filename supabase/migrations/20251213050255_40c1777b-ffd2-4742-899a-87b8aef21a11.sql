-- Add check constraint on provider column to include meta_cloud_api
ALTER TABLE public.whatsapp_contas DROP CONSTRAINT IF EXISTS whatsapp_contas_provider_check;

ALTER TABLE public.whatsapp_contas ADD CONSTRAINT whatsapp_contas_provider_check 
CHECK (provider IN ('gupshup', 'w_api', 'meta_cloud_api'));

-- Add business_id and api_version columns if not exists
ALTER TABLE public.whatsapp_contas ADD COLUMN IF NOT EXISTS business_id VARCHAR(100);
ALTER TABLE public.whatsapp_contas ADD COLUMN IF NOT EXISTS api_version VARCHAR(20) DEFAULT 'v21.0';