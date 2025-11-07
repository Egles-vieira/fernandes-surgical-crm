-- ============================================
-- FASE 3: ATUALIZAR RLS COM FUNÇÕES DE HIERARQUIA
-- ============================================

-- ================================================
-- PARTE 1: ATUALIZAR POLÍTICAS RLS DA TABELA CLIENTES
-- ================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Backoffice can view linked seller clientes" ON public.clientes;
DROP POLICY IF EXISTS "Leaders can update team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Leaders can view team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Sellers can create clientes" ON public.clientes;
DROP POLICY IF EXISTS "Sellers can update their clientes" ON public.clientes;
DROP POLICY IF EXISTS "Sellers can view their clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can view their clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can create their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clientes" ON public.clientes;

-- Criar novas políticas simplificadas usando funções de hierarquia

-- SELECT: Usuário vê clientes acessíveis pela hierarquia
CREATE POLICY "Usuários podem visualizar clientes acessíveis" 
  ON public.clientes FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT cliente_id FROM public.get_clientes_acessiveis(auth.uid()))
  );

-- INSERT: Criar clientes (roles comerciais + admin)
CREATE POLICY "Usuários comerciais podem criar clientes"
  ON public.clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'admin'::app_role,
      'diretor_comercial'::app_role,
      'gerente_comercial'::app_role,
      'coordenador_comercial'::app_role,
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'representante_comercial'::app_role,
      'executivo_contas'::app_role,
      'consultor_vendas'::app_role,
      'sales'::app_role
    ])
  );

-- UPDATE: Atualizar clientes acessíveis
CREATE POLICY "Usuários podem atualizar clientes acessíveis"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT cliente_id FROM public.get_clientes_acessiveis(auth.uid()))
  )
  WITH CHECK (
    id IN (SELECT cliente_id FROM public.get_clientes_acessiveis(auth.uid()))
  );

-- DELETE: Apenas hierarquia alta pode deletar (soft delete via excluido_em)
CREATE POLICY "Hierarquia alta pode deletar clientes"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (
    public.get_nivel_hierarquico(auth.uid()) <= 3
    AND id IN (SELECT cliente_id FROM public.get_clientes_acessiveis(auth.uid()))
  )
  WITH CHECK (
    public.get_nivel_hierarquico(auth.uid()) <= 3
  );

-- ================================================
-- PARTE 2: ATUALIZAR POLÍTICAS RLS DA TABELA VENDAS
-- ================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all vendas" ON public.vendas;
DROP POLICY IF EXISTS "Backoffice can update operational status" ON public.vendas;
DROP POLICY IF EXISTS "Backoffice can view linked seller vendas" ON public.vendas;
DROP POLICY IF EXISTS "Leaders can update team vendas" ON public.vendas;
DROP POLICY IF EXISTS "Leaders can view team vendas" ON public.vendas;
DROP POLICY IF EXISTS "Sellers can create vendas" ON public.vendas;
DROP POLICY IF EXISTS "Sellers can update their vendas" ON public.vendas;
DROP POLICY IF EXISTS "Sellers can view their vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users can create their own vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users can delete their own vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users can update their own vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users can view their own vendas" ON public.vendas;

-- Criar novas políticas simplificadas usando funções de hierarquia

-- SELECT: Usuário vê vendas acessíveis pela hierarquia
CREATE POLICY "Usuários podem visualizar vendas acessíveis"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- INSERT: Criar vendas (roles comerciais + admin)
CREATE POLICY "Usuários comerciais podem criar vendas"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'admin'::app_role,
      'diretor_comercial'::app_role,
      'gerente_comercial'::app_role,
      'coordenador_comercial'::app_role,
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'representante_comercial'::app_role,
      'executivo_contas'::app_role,
      'consultor_vendas'::app_role,
      'sales'::app_role
    ])
    AND (
      -- Vendedor deve ser o próprio usuário ou subordinado
      vendedor_id = auth.uid() 
      OR vendedor_id IN (SELECT subordinado_id FROM public.get_usuarios_subordinados(auth.uid()))
      OR public.get_nivel_hierarquico(auth.uid()) <= 3  -- Admin/hierarquia alta pode criar para qualquer um
    )
  );

-- UPDATE: Atualizar vendas acessíveis
CREATE POLICY "Usuários podem atualizar vendas acessíveis"
  ON public.vendas FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  )
  WITH CHECK (
    id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- DELETE: Apenas hierarquia alta pode deletar vendas
CREATE POLICY "Hierarquia alta pode deletar vendas"
  ON public.vendas FOR DELETE
  TO authenticated
  USING (
    public.get_nivel_hierarquico(auth.uid()) <= 3
    AND id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- ================================================
-- PARTE 3: ATUALIZAR POLÍTICAS RLS DE VENDAS_ITENS
-- ================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Delete itens by owner or seller" ON public.vendas_itens;
DROP POLICY IF EXISTS "Insert itens by owner or seller" ON public.vendas_itens;
DROP POLICY IF EXISTS "Update itens by owner or seller" ON public.vendas_itens;
DROP POLICY IF EXISTS "View itens by owner or seller" ON public.vendas_itens;

-- Criar novas políticas usando função de hierarquia

-- SELECT: Ver itens de vendas acessíveis
CREATE POLICY "Usuários podem visualizar itens de vendas acessíveis"
  ON public.vendas_itens FOR SELECT
  TO authenticated
  USING (
    venda_id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- INSERT: Criar itens em vendas acessíveis
CREATE POLICY "Usuários podem inserir itens em vendas acessíveis"
  ON public.vendas_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    venda_id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- UPDATE: Atualizar itens de vendas acessíveis
CREATE POLICY "Usuários podem atualizar itens de vendas acessíveis"
  ON public.vendas_itens FOR UPDATE
  TO authenticated
  USING (
    venda_id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  )
  WITH CHECK (
    venda_id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- DELETE: Deletar itens de vendas acessíveis
CREATE POLICY "Usuários podem deletar itens de vendas acessíveis"
  ON public.vendas_itens FOR DELETE
  TO authenticated
  USING (
    venda_id IN (SELECT venda_id FROM public.get_vendas_acessiveis(auth.uid()))
  );

-- ================================================
-- PARTE 4: ATUALIZAR POLÍTICAS RLS DE OPORTUNIDADES
-- ================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage all oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Backoffice can view linked seller oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Leaders can update team oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Leaders can view team oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Sellers can create oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Sellers can update their oportunidades" ON public.oportunidades;
DROP POLICY IF EXISTS "Sellers can view their oportunidades" ON public.oportunidades;

-- Criar novas políticas simplificadas

-- SELECT: Ver oportunidades baseado em hierarquia
CREATE POLICY "Usuários podem visualizar oportunidades acessíveis"
  ON public.oportunidades FOR SELECT
  TO authenticated
  USING (
    -- Admin e hierarquia alta: vê todas
    public.get_nivel_hierarquico(auth.uid()) <= 3
    OR
    -- Gestor: vê da equipe
    (public.has_role(auth.uid(), 'gestor_equipe'::app_role) AND equipe_id IN (
      SELECT equipe_id FROM public.get_equipes_gerenciadas(auth.uid())
    ))
    OR
    -- Vendedor: vê as próprias
    vendedor_id = auth.uid()
    OR proprietario_id = auth.uid()
    OR
    -- Backoffice: vê do vendedor vinculado
    (public.has_role(auth.uid(), 'backoffice'::app_role) AND vendedor_id IN (
      SELECT ur.vendedor_vinculado_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.vendedor_vinculado_id IS NOT NULL
    ))
  );

-- INSERT: Criar oportunidades
CREATE POLICY "Usuários comerciais podem criar oportunidades"
  ON public.oportunidades FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'admin'::app_role,
      'diretor_comercial'::app_role,
      'gerente_comercial'::app_role,
      'coordenador_comercial'::app_role,
      'manager'::app_role,
      'gestor_equipe'::app_role,
      'representante_comercial'::app_role,
      'executivo_contas'::app_role,
      'sales'::app_role
    ])
  );

-- UPDATE: Atualizar oportunidades acessíveis
CREATE POLICY "Usuários podem atualizar oportunidades acessíveis"
  ON public.oportunidades FOR UPDATE
  TO authenticated
  USING (
    public.get_nivel_hierarquico(auth.uid()) <= 3
    OR (public.has_role(auth.uid(), 'gestor_equipe'::app_role) AND equipe_id IN (
      SELECT equipe_id FROM public.get_equipes_gerenciadas(auth.uid())
    ))
    OR vendedor_id = auth.uid()
    OR proprietario_id = auth.uid()
  )
  WITH CHECK (
    public.get_nivel_hierarquico(auth.uid()) <= 3
    OR (public.has_role(auth.uid(), 'gestor_equipe'::app_role) AND equipe_id IN (
      SELECT equipe_id FROM public.get_equipes_gerenciadas(auth.uid())
    ))
    OR vendedor_id = auth.uid()
    OR proprietario_id = auth.uid()
  );

-- ================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ================================================

COMMENT ON POLICY "Usuários podem visualizar clientes acessíveis" ON public.clientes IS 
  'Aplica hierarquia comercial automaticamente via get_clientes_acessiveis()';

COMMENT ON POLICY "Usuários podem visualizar vendas acessíveis" ON public.vendas IS 
  'Aplica hierarquia comercial automaticamente via get_vendas_acessiveis()';

COMMENT ON POLICY "Usuários podem visualizar oportunidades acessíveis" ON public.oportunidades IS 
  'Aplica hierarquia comercial com lógica específica para cada role';