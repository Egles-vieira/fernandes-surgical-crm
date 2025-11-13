-- Allow updating WhatsApp messages to mark as read by authorized users
-- PostgreSQL doesn't support IF NOT EXISTS for CREATE POLICY

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Usuarios podem marcar mensagens como lidas" ON public.whatsapp_mensagens;

-- Policy: Users can mark received messages as read
CREATE POLICY "Usuarios podem marcar mensagens como lidas"
ON public.whatsapp_mensagens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversas wc
    WHERE wc.id = whatsapp_mensagens.conversa_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
        OR wc.atribuida_para_id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversas wc
    WHERE wc.id = whatsapp_mensagens.conversa_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
        OR wc.atribuida_para_id = auth.uid()
      )
  )
  AND direcao = 'recebida'
);
