-- Remover a política "Vendedor cria venda própria" que está incorreta
DROP POLICY IF EXISTS "Vendedor cria venda própria" ON public.vendas;

-- Atualizar a política "Criar vendas - hierarquia + admin + backoffice" 
-- para incluir verificação de vínculo do vendedor com o cliente
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;

CREATE POLICY "Criar vendas - hierarquia + admin + backoffice" ON public.vendas
FOR INSERT 
WITH CHECK (
  -- Admin pode criar qualquer venda
  has_role(auth.uid(), 'admin') 
  OR 
  -- Backoffice pode criar qualquer venda
  has_role(auth.uid(), 'backoffice')
  OR
  -- Níveis hierárquicos altos (1-3) podem criar qualquer venda
  (get_nivel_hierarquico(auth.uid()) IS NOT NULL AND get_nivel_hierarquico(auth.uid()) <= 3)
  OR
  -- Gestores e vendedores podem criar vendas para si mesmos ou subordinados
  -- MAS o vendedor selecionado deve ter vínculo com o cliente
  (
    has_any_role(auth.uid(), ARRAY['manager', 'gestor_equipe', 'sales', 'representante_comercial', 'executivo_contas', 'consultor_vendas']::app_role[])
    AND 
    (
      -- Criando venda para si mesmo
      vendedor_id = auth.uid() 
      OR 
      -- Criando venda para subordinado
      vendedor_id IN (SELECT subordinado_id FROM get_usuarios_subordinados(auth.uid()))
    )
    AND
    -- E o vendedor selecionado tem vínculo com o cliente
    can_access_cliente_por_cgc(vendedor_id, cliente_cnpj)
  )
);