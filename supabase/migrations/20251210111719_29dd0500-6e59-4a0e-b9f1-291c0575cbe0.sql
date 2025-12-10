
-- =====================================================
-- LIBERA ACESSO A ENTREGAS (TRACKING) PARA O VENDEDOR DO CLIENTE
-- =====================================================

-- Remove política antiga
DROP POLICY IF EXISTS "Usuários podem ver entregas de vendas acessíveis" ON vendas_entregas;
DROP POLICY IF EXISTS "vendas_entregas_select" ON vendas_entregas;
DROP POLICY IF EXISTS "vendas_entregas_insert" ON vendas_entregas;
DROP POLICY IF EXISTS "vendas_entregas_update" ON vendas_entregas;
DROP POLICY IF EXISTS "vendas_entregas_delete" ON vendas_entregas;

-- SELECT: Vendedor do cliente pode ver entregas
CREATE POLICY "vendas_entregas_select" ON vendas_entregas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_entregas.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- INSERT: Vendedor do cliente pode criar entregas
CREATE POLICY "vendas_entregas_insert" ON vendas_entregas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_entregas.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- UPDATE: Vendedor do cliente pode atualizar entregas
CREATE POLICY "vendas_entregas_update" ON vendas_entregas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_entregas.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- DELETE: Vendedor do cliente pode excluir entregas
CREATE POLICY "vendas_entregas_delete" ON vendas_entregas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_entregas.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);
