-- Adicionar colunas para transcrição de áudio na tabela whatsapp_mensagens
ALTER TABLE public.whatsapp_mensagens 
ADD COLUMN IF NOT EXISTS transcricao_audio TEXT,
ADD COLUMN IF NOT EXISTS transcricao_processada_em TIMESTAMPTZ;