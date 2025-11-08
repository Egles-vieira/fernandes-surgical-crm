-- Simplificar a política INSERT para evitar problemas com funções em runtime
DROP POLICY IF EXISTS "Usuários comerciais podem criar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Backoffice pode criar vendas do vendedor vinculado" ON public.vendas;

-- Nova política mais simples e eficiente
CREATE POLICY "Usuários podem criar vendas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  -- Usuários de alto nível (admin, diretores) podem criar qualquer venda
  (public.get_nivel_hierarquico(auth.uid()) <= 3)
  OR
  -- Outros usuários com roles comerciais podem criar vendas onde são o vendedor
  (
    public.has_any_role(auth.uid(), ARRAY[
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'representante_comercial'::app_role,
      'executivo_contas'::app_role,
      'consultor_vendas'::app_role,
      'sales'::app_role
    ])
    AND vendedor_id = auth.uid()
  )
  OR
  -- Gestores podem criar vendas para seus subordinados
  (
    public.has_any_role(auth.uid(), ARRAY['manager'::app_role, 'gestor_equipe'::app_role])
    AND vendedor_id IN (
      SELECT subordinado_id FROM public.get_usuarios_subordinados(auth.uid())
    )
  )
  OR
  -- Backoffice pode criar vendas do vendedor vinculado
  (
    public.has_role(auth.uid(), 'backoffice'::app_role)
    AND vendedor_id = public.get_linked_seller(auth.uid())
  )
);
