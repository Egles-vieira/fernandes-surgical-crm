-- ============================================================================
-- POLÍTICAS RLS COMPLETAS PARA PUBLIC.VENDAS
-- ============================================================================

-- 1. LIMPEZA: Remover todas as políticas existentes
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;
DROP POLICY IF EXISTS "vendas_select_staff_total" ON public.vendas;
DROP POLICY IF EXISTS "vendas_select_vendedor_escopo" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_staff_total" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_vendedor_escopo" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_staff_total" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_vendedor_escopo" ON public.vendas;
DROP POLICY IF EXISTS "vendas_delete_staff_total" ON public.vendas;
DROP POLICY IF EXISTS "vendas_delete_vendedor_escopo" ON public.vendas;

-- 2. HABILITAR E FORÇAR RLS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. POLÍTICAS DE SELECT (VISUALIZAÇÃO)
-- ============================================================================

-- Policy 1: Staff com acesso total pode ver todas as vendas
CREATE POLICY "vendas_select_staff_total"
ON public.vendas
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role
  ])
);

-- Policy 2: Vendedores veem apenas suas vendas de clientes acessíveis
CREATE POLICY "vendas_select_vendedor_escopo"
ON public.vendas
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ])
  AND user_id = auth.uid()
  AND can_access_cliente(auth.uid(), cliente_id)
);

-- ============================================================================
-- 4. POLÍTICAS DE INSERT (CRIAÇÃO)
-- ============================================================================

-- Policy 3: Staff pode criar vendas sem restrições
CREATE POLICY "vendas_insert_staff_total"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role
  ])
);

-- Policy 4: Vendedores criam apenas para si mesmos e clientes acessíveis
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
  AND user_id = auth.uid()
  AND responsavel_id = auth.uid()
  AND can_access_cliente(auth.uid(), cliente_id)
);

-- ============================================================================
-- 5. POLÍTICAS DE UPDATE (ATUALIZAÇÃO)
-- ============================================================================

-- Policy 5: Staff pode atualizar qualquer venda
CREATE POLICY "vendas_update_staff_total"
ON public.vendas
FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role
  ])
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role
  ])
);

-- Policy 6: Vendedores atualizam apenas suas vendas de clientes acessíveis
CREATE POLICY "vendas_update_vendedor_escopo"
ON public.vendas
FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ])
  AND user_id = auth.uid()
  AND can_access_cliente(auth.uid(), cliente_id)
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ])
  AND user_id = auth.uid()
  AND can_access_cliente(auth.uid(), cliente_id)
);

-- ============================================================================
-- 6. POLÍTICAS DE DELETE (EXCLUSÃO)
-- ============================================================================

-- Policy 7: Staff pode deletar qualquer venda
CREATE POLICY "vendas_delete_staff_total"
ON public.vendas
FOR DELETE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role
  ])
);

-- Policy 8: Vendedores deletam apenas suas vendas de clientes acessíveis
CREATE POLICY "vendas_delete_vendedor_escopo"
ON public.vendas
FOR DELETE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ])
  AND user_id = auth.uid()
  AND can_access_cliente(auth.uid(), cliente_id)
);

-- ============================================================================
-- 7. PROTEÇÃO DE CAMPOS CRÍTICOS (TRIGGER)
-- ============================================================================

-- Função que protege campos cliente_id, user_id e responsavel_id
CREATE OR REPLACE FUNCTION protect_vendas_critical_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário tem acesso total, permite tudo
  IF has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role
  ]) THEN
    RETURN NEW;
  END IF;

  -- Para perfis restritos, bloqueia alterações em campos críticos
  IF has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ]) THEN
    -- Verifica se campos críticos foram alterados
    IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar o cliente da venda';
    END IF;
    
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar o criador da venda';
    END IF;
    
    IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar o responsável da venda';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de proteção
DROP TRIGGER IF EXISTS trg_vendas_protect_fields ON public.vendas;
CREATE TRIGGER trg_vendas_protect_fields
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION protect_vendas_critical_fields();

-- ============================================================================
-- RESUMO DA IMPLEMENTAÇÃO
-- ============================================================================
-- ✅ 8 políticas RLS criadas (2 por operação: staff total + vendedor escopo)
-- ✅ RLS habilitado e forçado na tabela vendas
-- ✅ Trigger de proteção para campos críticos implementado
-- ✅ Perfis com acesso total: admin, diretor_comercial, gerente_comercial, coordenador_comercial
-- ✅ Perfis com acesso restrito: sales, representante_comercial, executivo_contas
-- ============================================================================