-- ============================================
-- FASE 0: SISTEMA DE PERMISSÕES (RBAC)
-- ============================================

-- 1. Criar enum de roles
CREATE TYPE public.app_role AS ENUM (
  'admin',      -- Acesso total ao sistema
  'manager',    -- Gerente: produtos, relatórios, gestão de equipe
  'sales',      -- Vendas: criar pedidos, ver produtos (sem custos), gerenciar clientes
  'warehouse',  -- Estoque: gerenciar inventário, ver estoque
  'support'     -- Suporte: tickets, atendimento (futura implementação)
);

-- 2. Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_roles
-- Apenas admins podem gerenciar roles
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Todos podem ver seus próprios roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- 3. Criar função de verificação de role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Criar função para verificar múltiplos roles (OR)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 5. Atualizar políticas de PRODUTOS
-- Remover política antiga permissiva
DROP POLICY IF EXISTS "Allow all operations on produtos for authenticated users" ON public.produtos;

-- Admins e managers podem gerenciar produtos
CREATE POLICY "Admins and managers can manage products"
ON public.produtos
FOR ALL
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- Sales e warehouse podem visualizar produtos (mas não custos para sales)
CREATE POLICY "Sales and warehouse can view products"
ON public.produtos
FOR SELECT
USING (public.has_any_role(auth.uid(), ARRAY['sales', 'warehouse']::app_role[]));

-- 6. Atualizar políticas de ESTOQUE
-- Remover política antiga permissiva
DROP POLICY IF EXISTS "Allow all operations on estoque for authenticated users" ON public.estoque;

-- Admins podem fazer tudo
CREATE POLICY "Admins can manage inventory"
ON public.estoque
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Warehouse pode inserir e visualizar
CREATE POLICY "Warehouse can manage inventory movements"
ON public.estoque
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'warehouse'));

CREATE POLICY "Warehouse and managers can view inventory"
ON public.estoque
FOR SELECT
USING (public.has_any_role(auth.uid(), ARRAY['warehouse', 'manager', 'admin']::app_role[]));

-- Sales pode apenas visualizar quantidades (para vendas)
CREATE POLICY "Sales can view inventory quantities"
ON public.estoque
FOR SELECT
USING (public.has_role(auth.uid(), 'sales'));

-- 7. Políticas para tabelas de referência (lookup tables)
-- condicoes_pagamento
CREATE POLICY "Only admins can modify payment conditions"
ON public.condicoes_pagamento
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update payment conditions"
ON public.condicoes_pagamento
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete payment conditions"
ON public.condicoes_pagamento
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- tipos_frete
CREATE POLICY "Only admins can modify freight types"
ON public.tipos_frete
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update freight types"
ON public.tipos_frete
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete freight types"
ON public.tipos_frete
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- tipos_pedido
CREATE POLICY "Only admins can modify order types"
ON public.tipos_pedido
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update order types"
ON public.tipos_pedido
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete order types"
ON public.tipos_pedido
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Atualizar políticas de VENDAS (adicionar verificação de role)
-- Vendas: admins, managers e sales podem criar
CREATE POLICY "Sales roles can create sales"
ON public.vendas
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales']::app_role[])
);

-- 9. Criar view para facilitar consultas de roles
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
  bool_or(ur.role = 'admin') as is_admin,
  bool_or(ur.role = 'manager') as is_manager,
  bool_or(ur.role = 'sales') as is_sales,
  bool_or(ur.role = 'warehouse') as is_warehouse,
  bool_or(ur.role = 'support') as is_support
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, u.raw_user_meta_data;

-- Comentários para documentação
COMMENT ON TABLE public.user_roles IS 'Armazena os roles/permissões de cada usuário do sistema';
COMMENT ON FUNCTION public.has_role IS 'Verifica se um usuário possui um role específico. Usa SECURITY DEFINER para evitar recursão RLS';
COMMENT ON FUNCTION public.has_any_role IS 'Verifica se um usuário possui pelo menos um dos roles especificados';
COMMENT ON TYPE public.app_role IS 'Enum de roles do sistema: admin, manager, sales, warehouse, support';