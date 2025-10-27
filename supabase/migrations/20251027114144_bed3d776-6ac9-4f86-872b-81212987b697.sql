-- RESOLUÇÃO DEFINITIVA DO ERRO "infinite recursion in user_roles"
-- Substituir APENAS as políticas recursivas, sem deletar todas (evita deadlock)

-- 1) Drop das políticas que estão causando a recursão (individuais)
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_can_read_their_roles" ON public.user_roles;

-- 2) Garantir que RLS está ativa (não forçada)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Criar políticas seguras e NÃO-recursivas

-- Política #1: Usuários podem ver APENAS suas próprias roles
CREATE POLICY user_roles_self_select
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política #2: Service role pode fazer tudo (backend/edge functions)
CREATE POLICY user_roles_service_all
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ⚠️ CRÍTICO: Não usamos has_role() ou has_any_role() em policies de user_roles
-- pois isso cria recursão infinita. A gestão de roles INSERT/UPDATE/DELETE deve 
-- ocorrer via service_role (backend) ou console Supabase direto.
