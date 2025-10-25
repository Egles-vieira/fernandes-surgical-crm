-- Adicionar policy para permitir DELETE em edi_cotacoes
CREATE POLICY "Admins e Managers podem deletar cotações"
  ON public.edi_cotacoes
  FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));