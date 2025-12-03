-- =====================================================
-- FASE 2B: Limpeza de Políticas RLS Redundantes
-- Objetivo: Remover políticas legadas que usam funções pesadas
-- =====================================================

-- =====================================================
-- ETAPA 1: VENDAS_ITENS - Remover 4 políticas legadas
-- Estas usam get_vendas_acessiveis() que é pesada
-- =====================================================

DROP POLICY IF EXISTS "Usuários podem visualizar itens de vendas acessíveis" ON vendas_itens;
DROP POLICY IF EXISTS "Usuários podem atualizar itens de vendas acessíveis" ON vendas_itens;
DROP POLICY IF EXISTS "Usuários podem inserir itens em vendas acessíveis" ON vendas_itens;
DROP POLICY IF EXISTS "Usuários podem deletar itens de vendas acessíveis" ON vendas_itens;

-- =====================================================
-- ETAPA 2: CLIENTES - Consolidar políticas
-- =====================================================

-- 2.1 Remover políticas redundantes de INSERT
DROP POLICY IF EXISTS "Sellers can create their clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários comerciais podem criar clientes" ON clientes;

-- 2.2 Criar política INSERT consolidada usando auth_check_any_role
CREATE POLICY "clientes_insert_v3" ON clientes
FOR INSERT TO authenticated
WITH CHECK (
  auth_check_any_role(ARRAY['admin', 'manager', 'diretor_comercial', 'gerente_comercial', 
    'coordenador_comercial', 'sales', 'gestor_equipe', 'representante_comercial', 
    'executivo_contas', 'consultor_vendas', 'backoffice'])
);

-- 2.3 Remover políticas redundantes de UPDATE
DROP POLICY IF EXISTS "Backoffice can update operational data" ON clientes;
DROP POLICY IF EXISTS "Hierarquia alta pode deletar clientes" ON clientes;

-- 2.4 Criar política DELETE (não existia corretamente)
CREATE POLICY "clientes_delete_v3" ON clientes
FOR DELETE TO authenticated
USING (
  auth_check_any_role(ARRAY['admin', 'manager'])
);

-- =====================================================
-- ETAPA 3: Atualizar estatísticas
-- =====================================================

ANALYZE vendas_itens;
ANALYZE clientes;