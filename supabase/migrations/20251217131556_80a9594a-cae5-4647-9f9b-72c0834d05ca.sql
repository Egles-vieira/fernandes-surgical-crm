-- Política de DELETE para contatos
-- Permite que proprietários, admins e managers excluam contatos
CREATE POLICY "Proprietários e Managers podem excluir contatos"
ON public.contatos
FOR DELETE
TO authenticated
USING (
  (proprietario_id = auth.uid()) 
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gerente_comercial'::app_role])
);