-- Tornar a coluna criado_por nullable para permitir templates criados via sync automático
ALTER TABLE public.whatsapp_templates 
ALTER COLUMN criado_por DROP NOT NULL;