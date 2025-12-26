-- Adicionar colunas para configuração de fora do expediente
ALTER TABLE public.whatsapp_configuracoes_atendimento 
ADD COLUMN IF NOT EXISTS template_fora_expediente VARCHAR(100),
ADD COLUMN IF NOT EXISTS mensagem_fora_expediente TEXT DEFAULT 'Olá! Obrigado por entrar em contato. No momento estamos fora do horário de atendimento. Retornaremos em breve!',
ADD COLUMN IF NOT EXISTS verificar_expediente_ativo BOOLEAN DEFAULT true;

-- Comentários
COMMENT ON COLUMN public.whatsapp_configuracoes_atendimento.template_fora_expediente IS 'Nome do template a ser enviado quando fora do expediente';
COMMENT ON COLUMN public.whatsapp_configuracoes_atendimento.mensagem_fora_expediente IS 'Mensagem de texto a ser enviada quando fora do expediente (fallback se template não configurado)';
COMMENT ON COLUMN public.whatsapp_configuracoes_atendimento.verificar_expediente_ativo IS 'Se true, verifica expediente antes de criar conversa';