-- =====================================================
-- FIX: Corrigir recursão infinita em user_roles
-- =====================================================

-- 1. Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- 2. Garantir que a função has_any_role existe e está correta
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 3. Garantir que a função has_role existe e está correta
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Criar políticas RLS CORRETAS usando funções SECURITY DEFINER
-- Política para SELECT: usuários podem ver suas próprias roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Política para INSERT: apenas admins podem inserir roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Política para UPDATE: apenas admins podem atualizar roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Política para DELETE: apenas admins podem deletar roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Comentários para documentação
COMMENT ON POLICY "Users can view their own roles" ON public.user_roles IS 
'Permite usuários verem suas próprias roles e admins verem todas. Usa SECURITY DEFINER para evitar recursão.';

COMMENT ON POLICY "Admins can insert roles" ON public.user_roles IS 
'Apenas admins podem criar novas associações de roles. Usa has_role com SECURITY DEFINER.';

COMMENT ON POLICY "Admins can update roles" ON public.user_roles IS 
'Apenas admins podem modificar roles existentes. Usa has_role com SECURITY DEFINER.';

COMMENT ON POLICY "Admins can delete roles" ON public.user_roles IS 
'Apenas admins podem remover associações de roles. Usa has_role com SECURITY DEFINER.';