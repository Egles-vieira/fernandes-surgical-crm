-- =====================================================
-- FASE 2 REVISADA: OTIMIZAÇÃO RLS PARA LOVABLE CLOUD
-- =====================================================

-- =====================================================
-- ETAPA 2A: CRIAR FUNÇÕES OTIMIZADAS
-- =====================================================

-- 1. Função para verificar hierarquia alta (nível <= 3)
CREATE OR REPLACE FUNCTION public.auth_check_high_hierarchy()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.role_hierarquia rh ON rh.role = ur.role
    WHERE ur.user_id = auth.uid() AND rh.nivel <= 3
  );
$$;

-- 2. Função para verificar múltiplos roles
CREATE OR REPLACE FUNCTION public.auth_check_any_role(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = ANY(_roles)
  );
$$;

-- 3. Função consolidada para verificar acesso a vendas
CREATE OR REPLACE FUNCTION public.auth_check_vendas_access(
  _cliente_id uuid,
  _vendedor_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- É o vendedor/responsável
    _vendedor_id = auth.uid() OR _user_id = auth.uid()
    -- OU tem hierarquia alta
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      INNER JOIN public.role_hierarquia rh ON rh.role = ur.role
      WHERE ur.user_id = auth.uid() AND rh.nivel <= 3
    )
    -- OU é membro ativo da equipe do cliente
    OR EXISTS (
      SELECT 1 FROM public.clientes c
      INNER JOIN public.membros_equipe me ON me.equipe_id = c.equipe_id
      WHERE c.id = _cliente_id 
        AND me.usuario_id = auth.uid() 
        AND me.esta_ativo = true
    );
$$;

-- =====================================================
-- ETAPA 2B: REMOVER POLÍTICAS REDUNDANTES
-- =====================================================

-- Remover políticas SELECT redundantes
DROP POLICY IF EXISTS "vendas_select_otimizado" ON vendas;

-- Remover políticas UPDATE redundantes
DROP POLICY IF EXISTS "vendas_update_otimizado" ON vendas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias vendas" ON vendas;

-- Remover políticas INSERT redundantes
DROP POLICY IF EXISTS "vendas_insert_otimizado" ON vendas;
DROP POLICY IF EXISTS "vendas_insert_staff_total" ON vendas;
DROP POLICY IF EXISTS "vendas_insert_vendedor_escopo" ON vendas;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias vendas" ON vendas;

-- Remover políticas DELETE redundantes
DROP POLICY IF EXISTS "vendas_delete_otimizado" ON vendas;
DROP POLICY IF EXISTS "vendas_delete_staff_total" ON vendas;
DROP POLICY IF EXISTS "vendas_delete_vendedor_escopo" ON vendas;
DROP POLICY IF EXISTS "Apenas admins podem deletar vendas" ON vendas;
DROP POLICY IF EXISTS "Hierarquia alta pode deletar vendas" ON vendas;

-- =====================================================
-- ETAPA 2C: CRIAR POLÍTICAS CONSOLIDADAS
-- =====================================================

-- 1. SELECT - Uma única política otimizada
CREATE POLICY "vendas_select_v3" ON vendas
FOR SELECT TO authenticated
USING (
  public.auth_check_vendas_access(cliente_id, vendedor_id, user_id)
);

-- 2. UPDATE - Uma única política otimizada
CREATE POLICY "vendas_update_v3" ON vendas
FOR UPDATE TO authenticated
USING (
  vendedor_id = auth.uid() 
  OR user_id = auth.uid()
  OR public.auth_check_high_hierarchy()
);

-- 3. INSERT - Uma única política otimizada
CREATE POLICY "vendas_insert_v3" ON vendas
FOR INSERT TO authenticated
WITH CHECK (
  public.auth_check_any_role(ARRAY['admin', 'manager', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial', 'sales', 'representante_comercial', 'executivo_contas'])
);

-- 4. DELETE - Uma única política otimizada
CREATE POLICY "vendas_delete_v3" ON vendas
FOR DELETE TO authenticated
USING (
  public.auth_check_any_role(ARRAY['admin', 'manager'])
);

-- =====================================================
-- ETAPA 2D: SIMPLIFICAR FUNÇÕES EXISTENTES
-- =====================================================

-- Simplificar auth_is_admin (remover fallback JWT inútil)
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- Simplificar auth_is_manager
CREATE OR REPLACE FUNCTION public.auth_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'manager');
$$;

-- =====================================================
-- ANALYZE PARA ATUALIZAR ESTATÍSTICAS
-- =====================================================

ANALYZE vendas;
ANALYZE user_roles;
ANALYZE role_hierarquia;
ANALYZE membros_equipe;
ANALYZE clientes;