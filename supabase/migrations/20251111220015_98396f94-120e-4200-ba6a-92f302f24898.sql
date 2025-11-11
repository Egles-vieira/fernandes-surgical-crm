-- Drop política restritiva existente
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;

-- Criar nova política incluindo todas as roles comerciais
CREATE POLICY "Criar vendas - hierarquia + admin + backoffice"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (get_nivel_hierarquico(auth.uid()) IS NOT NULL AND get_nivel_hierarquico(auth.uid()) <= 3)
  )
  OR (
    has_any_role(auth.uid(), ARRAY[
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'sales'::app_role,
      'representante_comercial'::app_role,
      'executivo_contas'::app_role,
      'consultor_vendas'::app_role
    ])
    AND (
      vendedor_id = auth.uid()
      OR vendedor_id IN (
        SELECT subordinado_id FROM get_usuarios_subordinados(auth.uid())
      )
    )
  )
  OR has_role(auth.uid(), 'backoffice'::app_role)
);