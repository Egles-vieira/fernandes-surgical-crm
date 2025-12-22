-- =============================================
-- Fila de Jobs Assíncronos do WhatsApp
-- Para processamento Fire-and-Forget de tarefas
-- =============================================

CREATE TABLE public.whatsapp_jobs_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  erro_mensagem TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ,
  proximo_retry_em TIMESTAMPTZ
);

-- Índices para queries frequentes
CREATE INDEX idx_whatsapp_jobs_queue_status ON public.whatsapp_jobs_queue(status);
CREATE INDEX idx_whatsapp_jobs_queue_conversa ON public.whatsapp_jobs_queue(conversa_id);
CREATE INDEX idx_whatsapp_jobs_queue_pending ON public.whatsapp_jobs_queue(status, criado_em) WHERE status = 'pending';
CREATE INDEX idx_whatsapp_jobs_queue_retry ON public.whatsapp_jobs_queue(proximo_retry_em) WHERE status = 'pending' AND proximo_retry_em IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.whatsapp_jobs_queue ENABLE ROW LEVEL SECURITY;

-- Policy para admins (usando perfil_id que existe na tabela)
CREATE POLICY "Admins podem gerenciar jobs"
ON public.whatsapp_jobs_queue
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.perfis_usuario 
    WHERE id = auth.uid() 
    AND perfil_id = '880302c2-3c02-4455-b991-882e3dd30071'
  )
);

-- Policy para service role (edge functions)
CREATE POLICY "Service role tem acesso total"
ON public.whatsapp_jobs_queue
FOR ALL
USING (auth.role() = 'service_role');

-- Comentários
COMMENT ON TABLE public.whatsapp_jobs_queue IS 'Fila de jobs assíncronos para processamento Fire-and-Forget do WhatsApp';
COMMENT ON COLUMN public.whatsapp_jobs_queue.tipo IS 'Tipo do job: calcular_datasul_e_responder, enviar_proposta, etc.';
COMMENT ON COLUMN public.whatsapp_jobs_queue.payload IS 'Dados necessários para processar o job (oportunidade_id, etc.)';
COMMENT ON COLUMN public.whatsapp_jobs_queue.proximo_retry_em IS 'Quando tentar novamente em caso de retry com backoff';