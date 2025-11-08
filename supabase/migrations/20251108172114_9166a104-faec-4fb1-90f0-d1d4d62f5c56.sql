-- Remover a política INSERT atual
DROP POLICY IF EXISTS "Criar vendas - regras hierárquicas" ON public.vendas;

-- Criar nova política consolidada incluindo admin explicitamente
CREATE POLICY "Criar vendas - hierarquia + admin + backoffice"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin sempre pode (explicitamente)
  public.has_role(auth.uid(), 'admin')
  OR
  -- Direção/níveis altos (quando houver mapeamento não-nulo)
  (
    public.get_nivel_hierarquico(auth.uid()) IS NOT NULL 
    AND public.get_nivel_hierarquico(auth.uid()) <= 3
  )
  OR
  -- Comercial: próprio ou subordinado
  (
    public.has_any_role(auth.uid(), ARRAY[
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'sales'::app_role
    ])
    AND (
      vendedor_id = auth.uid()
      OR vendedor_id IN (
        SELECT subordinado_id
        FROM public.get_usuarios_subordinados(auth.uid())
      )
    )
  )
  OR
  -- Backoffice: pode criar para qualquer vendedor (temporário, ajustar depois se necessário)
  public.has_role(auth.uid(), 'backoffice')
);