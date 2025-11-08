-- Update INSERT policy to include backoffice creating sales for linked seller
DROP POLICY IF EXISTS "Usuários comerciais podem criar vendas" ON public.vendas;

CREATE POLICY "Usuários comerciais podem criar vendas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role,
    'manager'::app_role,
    'gestor_equipe'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role,
    'consultor_vendas'::app_role,
    'sales'::app_role
  ])
  AND (
    vendedor_id = auth.uid()
    OR vendedor_id IN (
      SELECT subordinado_id FROM public.get_usuarios_subordinados(auth.uid())
    )
    OR public.get_nivel_hierarquico(auth.uid()) <= 3
  )
);

-- New policy for backoffice
CREATE POLICY "Backoffice pode criar vendas do vendedor vinculado"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'backoffice'::app_role)
  AND vendedor_id = public.get_linked_seller(auth.uid())
);
