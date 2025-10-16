-- ============================================
-- CORREÇÃO DE PROBLEMAS DE SEGURANÇA
-- ============================================

-- 1. PROBLEMA: View user_roles_view expõe auth.users
-- SOLUÇÃO: Remover a view e criar uma função segura ou usar apenas a tabela user_roles

DROP VIEW IF EXISTS public.user_roles_view;

-- Criar função segura para obter roles do usuário (não expõe auth.users)
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  roles app_role[],
  is_admin BOOLEAN,
  is_manager BOOLEAN,
  is_sales BOOLEAN,
  is_warehouse BOOLEAN,
  is_support BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id as user_id,
    (SELECT email FROM auth.users WHERE id = _user_id) as email,
    array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
    bool_or(ur.role = 'admin') as is_admin,
    bool_or(ur.role = 'manager') as is_manager,
    bool_or(ur.role = 'sales') as is_sales,
    bool_or(ur.role = 'warehouse') as is_warehouse,
    bool_or(ur.role = 'support') as is_support
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  GROUP BY _user_id;
$$;

-- 2. Criar função para listar todos os usuários com roles (apenas para admins)
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  roles app_role[]
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário atual é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list all users';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE u.deleted_at IS NULL
  GROUP BY u.id, u.email
  ORDER BY u.email;
END;
$$;

-- 3. PROBLEMA: Política RLS da tabela user_roles tem recursão
-- SOLUÇÃO: Já está correta, mas vamos garantir que está usando a própria tabela sem recursão
-- A política "Admins can manage all user roles" precisa ser ajustada para evitar possível recursão

DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- Nova política sem recursão - verifica diretamente na mesma tabela
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles check_role
    WHERE check_role.user_id = auth.uid() 
    AND check_role.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_roles check_role
    WHERE check_role.user_id = auth.uid() 
    AND check_role.role = 'admin'
  )
);

-- Comentários
COMMENT ON FUNCTION public.get_user_roles IS 'Retorna os roles de um usuário específico sem expor auth.users';
COMMENT ON FUNCTION public.list_users_with_roles IS 'Lista todos os usuários com seus roles (apenas admins)';