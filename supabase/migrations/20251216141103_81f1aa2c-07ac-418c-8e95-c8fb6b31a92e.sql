-- Adicionar campo distribuicao_automatica_ativa
ALTER TABLE public.whatsapp_configuracoes_atendimento 
ADD COLUMN IF NOT EXISTS distribuicao_automatica_ativa BOOLEAN DEFAULT true;

-- Atualizar registros existentes
UPDATE public.whatsapp_configuracoes_atendimento 
SET distribuicao_automatica_ativa = true
WHERE distribuicao_automatica_ativa IS NULL;