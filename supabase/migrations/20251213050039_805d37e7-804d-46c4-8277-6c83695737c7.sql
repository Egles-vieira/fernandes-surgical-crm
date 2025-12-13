-- Drop existing check constraint and add new one with meta_cloud_api
ALTER TABLE public.whatsapp_contas DROP CONSTRAINT IF EXISTS whatsapp_contas_provedor_check;

ALTER TABLE public.whatsapp_contas ADD CONSTRAINT whatsapp_contas_provedor_check 
CHECK (provedor IN ('gupshup', 'w_api', 'meta_cloud_api'));