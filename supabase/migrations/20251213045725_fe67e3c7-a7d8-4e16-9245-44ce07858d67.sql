-- Add Meta Cloud API columns to whatsapp_contas table
ALTER TABLE public.whatsapp_contas
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS meta_waba_id TEXT;