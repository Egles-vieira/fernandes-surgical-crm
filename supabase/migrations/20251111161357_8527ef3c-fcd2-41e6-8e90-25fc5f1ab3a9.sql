-- Enable DELETE RLS policy for metas_vendedor so authorized users can remove metas
-- RLS is already enabled on metas_vendedor per current config

-- Create policy allowing delete by admins/managers, team leaders of the associated equipe, or the owner seller
CREATE POLICY "Líderes e admins podem deletar metas de vendedor"
ON public.metas_vendedor
FOR DELETE
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  OR (EXISTS (
    SELECT 1 FROM public.equipes e
    WHERE e.id = metas_vendedor.equipe_id
      AND (e.lider_equipe_id = auth.uid())
  ))
  OR (vendedor_id = auth.uid())
);
