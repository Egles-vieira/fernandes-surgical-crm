-- Remover TODAS as políticas INSERT antigas
DROP POLICY IF EXISTS "Usuários comerciais podem criar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Backoffice pode criar vendas do vendedor vinculado" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem criar vendas" ON public.vendas;

-- Criar UMA ÚNICA política INSERT simplificada
CREATE POLICY "Criar vendas - regras hierárquicas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin sempre pode
  public.get_nivel_hierarquico(auth.uid()) <= 3
  OR
  -- Ou: tem role comercial E vendedor_id é ele mesmo ou subordinado
  (
    public.has_any_role(auth.uid(), ARRAY[
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'sales'::app_role
    ])
    AND (
      vendedor_id = auth.uid()
      OR vendedor_id IN (
        SELECT subordinado_id FROM public.get_usuarios_subordinados(auth.uid())
      )
    )
  )
);
