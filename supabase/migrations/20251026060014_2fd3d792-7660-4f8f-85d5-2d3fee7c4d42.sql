-- =====================================================
-- FIX 2: Eliminar recursão nas políticas de public.user_roles DEFINITIVAMENTE
-- Estratégia: NÃO referenciar funções que leem user_roles dentro de políticas de user_roles
-- =====================================================

-- Remover políticas com verificação de admin (causavam recursão via has_role)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Política mínima e segura: apenas o próprio usuário pode ver suas roles
CREATE POLICY "Self can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Sem políticas de INSERT/UPDATE/DELETE => bloqueado por padrão
-- Gestão de roles deve ser feita por função SECURITY DEFINER (service) ou console administrativo

COMMENT ON POLICY "Self can view own roles" ON public.user_roles IS 
'Evita recursão: permite somente SELECT das próprias roles. DML bloqueado por padrão.';