
-- =====================================================
-- LIBERA ACESSO A ENDEREÇOS DO CLIENTE PARA O VENDEDOR
-- =====================================================

-- Remove políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver endereços de seus clientes" ON cliente_enderecos;
DROP POLICY IF EXISTS "cliente_enderecos_select" ON cliente_enderecos;
DROP POLICY IF EXISTS "cliente_enderecos_insert" ON cliente_enderecos;
DROP POLICY IF EXISTS "cliente_enderecos_update" ON cliente_enderecos;
DROP POLICY IF EXISTS "cliente_enderecos_delete" ON cliente_enderecos;

-- SELECT: Vendedor do cliente pode ver endereços
CREATE POLICY "cliente_enderecos_select" ON cliente_enderecos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = cliente_enderecos.cliente_id 
    AND (
      c.vendedor_id = auth.uid() 
      OR c.user_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- INSERT: Vendedor do cliente pode criar endereços
CREATE POLICY "cliente_enderecos_insert" ON cliente_enderecos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = cliente_enderecos.cliente_id 
    AND (
      c.vendedor_id = auth.uid() 
      OR c.user_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- UPDATE: Vendedor do cliente pode editar endereços
CREATE POLICY "cliente_enderecos_update" ON cliente_enderecos
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = cliente_enderecos.cliente_id 
    AND (
      c.vendedor_id = auth.uid() 
      OR c.user_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- DELETE: Vendedor do cliente pode excluir endereços
CREATE POLICY "cliente_enderecos_delete" ON cliente_enderecos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = cliente_enderecos.cliente_id 
    AND (
      c.vendedor_id = auth.uid() 
      OR c.user_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- =====================================================
-- LIBERA ACESSO A ATIVIDADES DO CLIENTE PARA O VENDEDOR
-- =====================================================

-- Remove políticas existentes de atividades
DROP POLICY IF EXISTS "atividades_select" ON atividades;
DROP POLICY IF EXISTS "atividades_insert" ON atividades;
DROP POLICY IF EXISTS "atividades_update" ON atividades;
DROP POLICY IF EXISTS "atividades_delete" ON atividades;
DROP POLICY IF EXISTS "Usuários podem ver suas atividades" ON atividades;
DROP POLICY IF EXISTS "Usuários podem criar atividades" ON atividades;
DROP POLICY IF EXISTS "Usuários podem atualizar suas atividades" ON atividades;

-- SELECT: Vendedor do cliente pode ver atividades vinculadas ao cliente dele
CREATE POLICY "atividades_select" ON atividades
FOR SELECT TO authenticated
USING (
  -- Responsável pela atividade
  responsavel_id = auth.uid()
  -- OU criador da atividade  
  OR criado_por = auth.uid()
  -- OU vendedor do cliente vinculado
  OR EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = atividades.cliente_id 
    AND c.vendedor_id = auth.uid()
  )
  -- OU hierarquia alta
  OR auth_check_high_hierarchy()
);

-- INSERT: Vendedor do cliente pode criar atividades para seus clientes
CREATE POLICY "atividades_insert" ON atividades
FOR INSERT TO authenticated
WITH CHECK (
  -- Pode criar se for responsável
  responsavel_id = auth.uid()
  -- OU se é vendedor do cliente
  OR EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = atividades.cliente_id 
    AND c.vendedor_id = auth.uid()
  )
  -- OU hierarquia alta
  OR auth_check_high_hierarchy()
);

-- UPDATE: Vendedor do cliente pode editar atividades
CREATE POLICY "atividades_update" ON atividades
FOR UPDATE TO authenticated
USING (
  responsavel_id = auth.uid()
  OR criado_por = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = atividades.cliente_id 
    AND c.vendedor_id = auth.uid()
  )
  OR auth_check_high_hierarchy()
);

-- DELETE: Vendedor do cliente pode excluir atividades
CREATE POLICY "atividades_delete" ON atividades
FOR DELETE TO authenticated
USING (
  responsavel_id = auth.uid()
  OR criado_por = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = atividades.cliente_id 
    AND c.vendedor_id = auth.uid()
  )
  OR auth_check_high_hierarchy()
);
