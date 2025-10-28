-- ============================================
-- PARTE 3: RLS POLICIES HIERÁRQUICAS
-- ============================================

-- 1. POLÍTICAS PARA CLIENTES
-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can create their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clientes" ON public.clientes;

-- Admins podem gerenciar todos os clientes
CREATE POLICY "Admins can manage all clientes"
ON public.clientes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Líderes podem visualizar clientes da sua equipe
CREATE POLICY "Leaders can view team clientes"
ON public.clientes
FOR SELECT
USING (
    has_role(auth.uid(), 'lider') AND (
        equipe_id = get_user_team(auth.uid()) OR
        is_team_leader(auth.uid(), equipe_id)
    )
);

-- Líderes podem atualizar clientes da sua equipe
CREATE POLICY "Leaders can update team clientes"
ON public.clientes
FOR UPDATE
USING (
    has_role(auth.uid(), 'lider') AND (
        equipe_id = get_user_team(auth.uid()) OR
        is_team_leader(auth.uid(), equipe_id)
    )
);

-- Vendedores podem visualizar apenas seus clientes
CREATE POLICY "Sellers can view their clientes"
ON public.clientes
FOR SELECT
USING (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Vendedores podem criar clientes (automaticamente vinculados a eles)
CREATE POLICY "Sellers can create their clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Vendedores podem atualizar seus clientes
CREATE POLICY "Sellers can update their clientes"
ON public.clientes
FOR UPDATE
USING (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Backoffice pode visualizar clientes do vendedor vinculado
CREATE POLICY "Backoffice can view linked seller clientes"
ON public.clientes
FOR SELECT
USING (
    has_role(auth.uid(), 'backoffice') AND 
    vendedor_id = get_linked_seller(auth.uid())
);

-- Backoffice pode atualizar dados operacionais dos clientes
CREATE POLICY "Backoffice can update operational data"
ON public.clientes
FOR UPDATE
USING (
    has_role(auth.uid(), 'backoffice') AND 
    vendedor_id = get_linked_seller(auth.uid())
);

-- 2. POLÍTICAS PARA OPORTUNIDADES
-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários podem visualizar oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Sales podem criar oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Proprietários e Managers podem atualizar oportunidades" ON public.oportunidades;

-- Admins podem gerenciar todas as oportunidades
CREATE POLICY "Admins can manage all oportunidades"
ON public.oportunidades
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Líderes podem visualizar oportunidades da equipe
CREATE POLICY "Leaders can view team oportunidades"
ON public.oportunidades
FOR SELECT
USING (
    has_role(auth.uid(), 'lider') AND (
        equipe_id = get_user_team(auth.uid()) OR
        is_team_leader(auth.uid(), equipe_id)
    )
);

-- Líderes podem atualizar oportunidades da equipe
CREATE POLICY "Leaders can update team oportunidades"
ON public.oportunidades
FOR UPDATE
USING (
    has_role(auth.uid(), 'lider') AND (
        equipe_id = get_user_team(auth.uid()) OR
        is_team_leader(auth.uid(), equipe_id)
    )
);

-- Vendedores podem visualizar suas oportunidades
CREATE POLICY "Sellers can view their oportunidades"
ON public.oportunidades
FOR SELECT
USING (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Vendedores podem criar oportunidades
CREATE POLICY "Sellers can create oportunidades"
ON public.oportunidades
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Vendedores podem atualizar suas oportunidades
CREATE POLICY "Sellers can update their oportunidades"
ON public.oportunidades
FOR UPDATE
USING (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Backoffice pode visualizar oportunidades do vendedor vinculado
CREATE POLICY "Backoffice can view linked seller oportunidades"
ON public.oportunidades
FOR SELECT
USING (
    has_role(auth.uid(), 'backoffice') AND 
    vendedor_id = get_linked_seller(auth.uid())
);

-- 3. POLÍTICAS PARA VENDAS
-- Remover policies antigas
DROP POLICY IF EXISTS "Sales roles can create sales" ON public.vendas;

-- Admins podem gerenciar todas as vendas
CREATE POLICY "Admins can manage all vendas"
ON public.vendas
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Líderes podem visualizar vendas da equipe
CREATE POLICY "Leaders can view team vendas"
ON public.vendas
FOR SELECT
USING (
    has_role(auth.uid(), 'lider') AND (
        equipe_id = get_user_team(auth.uid()) OR
        is_team_leader(auth.uid(), equipe_id)
    )
);

-- Líderes podem atualizar vendas da equipe (aprovações)
CREATE POLICY "Leaders can update team vendas"
ON public.vendas
FOR UPDATE
USING (
    has_role(auth.uid(), 'lider') AND (
        equipe_id = get_user_team(auth.uid()) OR
        is_team_leader(auth.uid(), equipe_id)
    )
);

-- Vendedores podem visualizar suas vendas
CREATE POLICY "Sellers can view their vendas"
ON public.vendas
FOR SELECT
USING (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Vendedores podem criar vendas
CREATE POLICY "Sellers can create vendas"
ON public.vendas
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Vendedores podem atualizar suas vendas
CREATE POLICY "Sellers can update their vendas"
ON public.vendas
FOR UPDATE
USING (
    has_role(auth.uid(), 'sales') AND vendedor_id = auth.uid()
);

-- Backoffice pode visualizar vendas do vendedor vinculado
CREATE POLICY "Backoffice can view linked seller vendas"
ON public.vendas
FOR SELECT
USING (
    has_role(auth.uid(), 'backoffice') AND 
    vendedor_id = get_linked_seller(auth.uid())
);

-- Backoffice pode atualizar status operacionais
CREATE POLICY "Backoffice can update operational status"
ON public.vendas
FOR UPDATE
USING (
    has_role(auth.uid(), 'backoffice') AND 
    vendedor_id = get_linked_seller(auth.uid())
);

-- 4. RLS POLICIES PARA INTERAÇÕES
-- Admins podem gerenciar todas as interações
CREATE POLICY "Admins can manage all interacoes"
ON public.interacoes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Usuários podem visualizar interações de clientes que têm acesso
CREATE POLICY "Users can view accessible interacoes"
ON public.interacoes
FOR SELECT
USING (
    can_access_cliente(auth.uid(), cliente_id)
);

-- Usuários podem criar interações em clientes que têm acesso
CREATE POLICY "Users can create interacoes"
ON public.interacoes
FOR INSERT
WITH CHECK (
    can_access_cliente(auth.uid(), cliente_id)
);

-- 5. RLS POLICIES PARA LOGS DE AUDITORIA
-- Admins e líderes podem visualizar logs
CREATE POLICY "Admins and leaders can view logs"
ON public.logs_auditoria
FOR SELECT
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'lider']::app_role[])
);

-- Sistema pode inserir logs (qualquer usuário autenticado)
CREATE POLICY "System can insert logs"
ON public.logs_auditoria
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. ATUALIZAR POLÍTICAS DE EQUIPES
DROP POLICY IF EXISTS "Usuários podem visualizar equipes ativas" ON public.equipes;
DROP POLICY IF EXISTS "Users can view active teams" ON public.equipes;

CREATE POLICY "All users can view active teams"
ON public.equipes
FOR SELECT
USING (esta_ativa = true AND excluido_em IS NULL);

-- Líderes podem atualizar suas equipes
CREATE POLICY "Leaders can update their teams"
ON public.equipes
FOR UPDATE
USING (lider_equipe_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar equipes
CREATE POLICY "Admins can manage teams"
ON public.equipes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 7. ATUALIZAR POLÍTICAS DE MEMBROS_EQUIPE
DROP POLICY IF EXISTS "Usuários podem visualizar membros da equipe" ON public.membros_equipe;
DROP POLICY IF EXISTS "Users can view team members" ON public.membros_equipe;

CREATE POLICY "Team members can view their team"
ON public.membros_equipe
FOR SELECT
USING (
    equipe_id IN (
        SELECT id FROM equipes WHERE lider_equipe_id = auth.uid()
    ) OR
    usuario_id = auth.uid() OR
    has_any_role(auth.uid(), ARRAY['admin', 'lider']::app_role[])
);

-- Líderes e admins podem gerenciar membros da equipe
CREATE POLICY "Leaders and admins can manage team members"
ON public.membros_equipe
FOR ALL
USING (
    equipe_id IN (
        SELECT id FROM equipes WHERE lider_equipe_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin')
)
WITH CHECK (
    equipe_id IN (
        SELECT id FROM equipes WHERE lider_equipe_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin')
);