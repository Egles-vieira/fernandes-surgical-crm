-- Criar tabela para mensagens do chat assistente
CREATE TABLE IF NOT EXISTS public.chat_assistente_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscar mensagens por ticket
CREATE INDEX idx_chat_assistente_mensagens_ticket_id ON public.chat_assistente_mensagens(ticket_id);

-- Habilitar RLS
ALTER TABLE public.chat_assistente_mensagens ENABLE ROW LEVEL SECURITY;

-- Policy para permitir que usuários autenticados vejam mensagens
CREATE POLICY "Usuários autenticados podem ver mensagens do chat"
ON public.chat_assistente_mensagens
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy para permitir que usuários autenticados criem mensagens
CREATE POLICY "Usuários autenticados podem criar mensagens do chat"
ON public.chat_assistente_mensagens
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);