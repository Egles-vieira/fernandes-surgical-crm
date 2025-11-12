-- Corrigir política RLS para permitir que admins/managers criem vendas em nome de vendedores

-- Remover política restritiva atual
DROP POLICY IF EXISTS "vendas_insert_vendedor_escopo" ON public.vendas;

-- Recriar política para vendedores - permite criar vendas se:
-- 1. Tem o role correto E
-- 2. É o dono do cliente (vendedor_id no cliente) OU
-- 3. Faz parte da equipe do cliente
CREATE POLICY "vendas_insert_vendedor_escopo"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ])
  AND (
    -- Vendedor pode criar venda se é responsável pela venda E tem acesso ao cliente
    (
      responsavel_id = auth.uid()
      AND can_access_cliente(auth.uid(), cliente_id)
    )
    -- OU se o vendedor_id da venda é ele E tem acesso ao cliente
    OR (
      vendedor_id = auth.uid()
      AND can_access_cliente(auth.uid(), cliente_id)
    )
  )
);

-- Atualizar a política de staff para garantir que possam atribuir vendedores
DROP POLICY IF EXISTS "vendas_insert_staff_total" ON public.vendas;

CREATE POLICY "vendas_insert_staff_total"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role,
    'manager'::app_role
  ])
  -- Staff pode criar vendas e atribuir a qualquer vendedor
  -- Desde que o vendedor/responsavel tenha acesso ao cliente
  AND (
    can_access_cliente(COALESCE(vendedor_id, responsavel_id), cliente_id)
  )
);

COMMENT ON POLICY "vendas_insert_staff_total" ON public.vendas IS 
'Staff (admin/manager) pode criar vendas e atribuir a vendedores, desde que o vendedor atribuído tenha acesso ao cliente';

COMMENT ON POLICY "vendas_insert_vendedor_escopo" ON public.vendas IS 
'Vendedores podem criar vendas apenas para clientes que eles têm acesso (são donos ou fazem parte da equipe)';