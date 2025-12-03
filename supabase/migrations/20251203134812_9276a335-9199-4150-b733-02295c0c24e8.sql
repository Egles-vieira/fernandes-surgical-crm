-- =====================================================
-- LIMPEZA DE RLS POLICIES DUPLICADAS - TABELA VENDAS
-- Remove policies antigas/pesadas, mantém apenas otimizadas
-- =====================================================

-- ===================
-- 1. DROP SELECT POLICIES REDUNDANTES
-- ===================

-- Policy que usa get_vendas_acessiveis() - MUITO PESADA
DROP POLICY IF EXISTS "Usuários podem visualizar vendas acessíveis" ON public.vendas;

-- Policies redundantes (já cobertas por vendas_select_otimizado)
DROP POLICY IF EXISTS "Admin pode visualizar todas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias vendas" ON public.vendas;
DROP POLICY IF EXISTS "vendas_select_staff_total" ON public.vendas;
DROP POLICY IF EXISTS "vendas_select_vendedor_escopo" ON public.vendas;
DROP POLICY IF EXISTS "Vendedores podem ver suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Managers podem ver todas vendas" ON public.vendas;

-- ===================
-- 2. DROP UPDATE POLICIES REDUNDANTES
-- ===================

DROP POLICY IF EXISTS "Usuários podem atualizar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Vendedores podem atualizar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admin pode atualizar vendas" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_staff_total" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_vendedor_escopo" ON public.vendas;

-- ===================
-- 3. DROP INSERT POLICIES REDUNDANTES
-- ===================

DROP POLICY IF EXISTS "Usuários podem criar vendas" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_staff" ON public.vendas;

-- ===================
-- 4. DROP DELETE POLICIES REDUNDANTES
-- ===================

DROP POLICY IF EXISTS "Admin pode deletar vendas" ON public.vendas;
DROP POLICY IF EXISTS "vendas_delete_admin" ON public.vendas;

-- ===================
-- 5. GARANTIR QUE POLICIES OTIMIZADAS EXISTEM
-- ===================

-- Verificar e criar SELECT otimizado se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendas' 
        AND policyname = 'vendas_select_otimizado'
    ) THEN
        CREATE POLICY "vendas_select_otimizado" ON public.vendas
        FOR SELECT USING (
            -- Admin/Manager: acesso total via role direto
            (EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role = ANY(ARRAY['admin'::app_role, 'manager'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role])
            ))
            OR
            -- Vendedor: apenas suas vendas
            (vendedor_id = auth.uid())
            OR
            -- Responsável: suas vendas atribuídas
            (responsavel_id = auth.uid())
            OR
            -- Membro de equipe: vendas da equipe
            (equipe_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM membros_equipe me
                WHERE me.equipe_id = vendas.equipe_id
                AND me.usuario_id = auth.uid()
                AND me.esta_ativo = true
            ))
        );
    END IF;
END $$;

-- Verificar e criar UPDATE otimizado se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendas' 
        AND policyname = 'vendas_update_otimizado'
    ) THEN
        CREATE POLICY "vendas_update_otimizado" ON public.vendas
        FOR UPDATE USING (
            (EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role = ANY(ARRAY['admin'::app_role, 'manager'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role])
            ))
            OR
            (vendedor_id = auth.uid())
            OR
            (responsavel_id = auth.uid())
            OR
            (equipe_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM membros_equipe me
                WHERE me.equipe_id = vendas.equipe_id
                AND me.usuario_id = auth.uid()
                AND me.esta_ativo = true
            ))
        );
    END IF;
END $$;

-- Verificar e criar INSERT otimizado se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendas' 
        AND policyname = 'vendas_insert_otimizado'
    ) THEN
        CREATE POLICY "vendas_insert_otimizado" ON public.vendas
        FOR INSERT WITH CHECK (
            has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'sales'::app_role, 'coordenador_comercial'::app_role, 'representante_comercial'::app_role])
        );
    END IF;
END $$;

-- Verificar e criar DELETE otimizado se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendas' 
        AND policyname = 'vendas_delete_otimizado'
    ) THEN
        CREATE POLICY "vendas_delete_otimizado" ON public.vendas
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role = ANY(ARRAY['admin'::app_role, 'manager'::app_role])
            )
        );
    END IF;
END $$;