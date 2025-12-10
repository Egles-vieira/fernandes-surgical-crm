
-- =====================================================
-- LIBERA ACESSO A ITENS DE VENDAS PARA O VENDEDOR DO CLIENTE
-- =====================================================

DROP POLICY IF EXISTS "vendas_itens_select" ON vendas_itens;
DROP POLICY IF EXISTS "vendas_itens_select_otimizado" ON vendas_itens;
DROP POLICY IF EXISTS "Usuários podem ver itens de suas vendas" ON vendas_itens;

CREATE POLICY "vendas_itens_select" ON vendas_itens
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_itens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- Também precisamos ajustar INSERT, UPDATE e DELETE
DROP POLICY IF EXISTS "vendas_itens_insert" ON vendas_itens;
DROP POLICY IF EXISTS "vendas_itens_update" ON vendas_itens;
DROP POLICY IF EXISTS "vendas_itens_delete" ON vendas_itens;

CREATE POLICY "vendas_itens_insert" ON vendas_itens
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_itens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

CREATE POLICY "vendas_itens_update" ON vendas_itens
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_itens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

CREATE POLICY "vendas_itens_delete" ON vendas_itens
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = vendas_itens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);
