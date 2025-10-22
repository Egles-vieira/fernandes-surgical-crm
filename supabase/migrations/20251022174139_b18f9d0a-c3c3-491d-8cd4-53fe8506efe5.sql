-- Criar tabela para anexos de mensagens do chat de criação
CREATE TABLE IF NOT EXISTS public.tickets_anexos_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo_anexo TEXT DEFAULT 'imagem' CHECK (tipo_anexo IN ('imagem', 'documento', 'audio', 'video')),
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado BOOLEAN DEFAULT false,
  deletado_em TIMESTAMPTZ
);

-- Habilitar RLS
ALTER TABLE public.tickets_anexos_chat ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem visualizar anexos"
ON public.tickets_anexos_chat FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem criar anexos"
ON public.tickets_anexos_chat FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Usuários podem deletar seus próprios anexos"
ON public.tickets_anexos_chat FOR UPDATE
TO authenticated
USING (auth.uid() = criado_por)
WITH CHECK (auth.uid() = criado_por);

-- Índices
CREATE INDEX idx_tickets_anexos_chat_ticket ON public.tickets_anexos_chat(ticket_id);
CREATE INDEX idx_tickets_anexos_chat_criado_por ON public.tickets_anexos_chat(criado_por);
CREATE INDEX idx_tickets_anexos_chat_tipo ON public.tickets_anexos_chat(tipo_anexo);