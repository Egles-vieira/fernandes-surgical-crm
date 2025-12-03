-- =====================================================
-- OTIMIZAÇÃO CRÍTICA: RLS Policies para 300 usuários
-- =====================================================

-- 1. Adicionar venda_id em propostas_analytics_cliques para filtro direto
ALTER TABLE public.propostas_analytics_cliques 
ADD COLUMN IF NOT EXISTS venda_id uuid REFERENCES public.vendas(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_propostas_analytics_cliques_venda_id 
ON public.propostas_analytics_cliques(venda_id);

-- Atualizar registros existentes (popular venda_id a partir de analytics_id)
UPDATE public.propostas_analytics_cliques pac
SET venda_id = pa.venda_id
FROM public.propostas_analytics pa
WHERE pac.analytics_id = pa.id
AND pac.venda_id IS NULL;

-- Trigger para popular venda_id automaticamente em novos registros
CREATE OR REPLACE FUNCTION public.set_clique_venda_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.venda_id IS NULL AND NEW.analytics_id IS NOT NULL THEN
    SELECT venda_id INTO NEW.venda_id
    FROM public.propostas_analytics
    WHERE id = NEW.analytics_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_clique_venda_id ON public.propostas_analytics_cliques;
CREATE TRIGGER trg_set_clique_venda_id
  BEFORE INSERT ON public.propostas_analytics_cliques
  FOR EACH ROW
  EXECUTE FUNCTION public.set_clique_venda_id();

-- =====================================================
-- 2. OTIMIZAR RLS Policy de CLIENTES
-- =====================================================

-- Dropar policies antigas que usam get_clientes_acessiveis()
DROP POLICY IF EXISTS "Usuários podem visualizar clientes acessíveis" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar clientes acessíveis" ON public.clientes;

-- Nova policy SELECT otimizada (sem subqueries pesadas)
CREATE POLICY "clientes_select_otimizado" ON public.clientes
FOR SELECT USING (
  -- Admin/Manager vê tudo
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
  )
  OR
  -- Vendedor vê seus próprios clientes
  vendedor_id = auth.uid()
  OR
  user_id = auth.uid()
  OR
  -- Membro de equipe vê clientes da equipe
  (equipe_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.membros_equipe me
    WHERE me.equipe_id = clientes.equipe_id
    AND me.usuario_id = auth.uid()
    AND me.esta_ativo = true
  ))
);

-- Nova policy UPDATE otimizada
CREATE POLICY "clientes_update_otimizado" ON public.clientes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
  )
  OR
  vendedor_id = auth.uid()
  OR
  user_id = auth.uid()
  OR
  (equipe_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.membros_equipe me
    WHERE me.equipe_id = clientes.equipe_id
    AND me.usuario_id = auth.uid()
    AND me.esta_ativo = true
  ))
);

-- =====================================================
-- 3. OTIMIZAR RLS Policy de VENDAS
-- =====================================================

-- Verificar e criar índices críticos para vendas
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_id ON public.vendas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_user_id ON public.vendas(user_id);

-- Dropar policies antigas que usam get_vendas_acessiveis()
DROP POLICY IF EXISTS "Usuários podem ver vendas acessíveis" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem atualizar vendas acessíveis" ON public.vendas;

-- Nova policy SELECT otimizada
CREATE POLICY "vendas_select_otimizado" ON public.vendas
FOR SELECT USING (
  -- Admin/Manager vê tudo
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
  )
  OR
  -- Dono da venda
  vendedor_id = auth.uid()
  OR
  user_id = auth.uid()
  OR
  -- Membro de equipe que tem acesso ao cliente
  EXISTS (
    SELECT 1 FROM public.clientes c
    JOIN public.membros_equipe me ON me.equipe_id = c.equipe_id
    WHERE c.id = vendas.cliente_id
    AND me.usuario_id = auth.uid()
    AND me.esta_ativo = true
  )
);

-- Nova policy UPDATE otimizada
CREATE POLICY "vendas_update_otimizado" ON public.vendas
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
  )
  OR
  vendedor_id = auth.uid()
  OR
  user_id = auth.uid()
);

-- =====================================================
-- 4. OTIMIZAR RLS Policy de VENDAS_ITENS
-- =====================================================

-- Índice crítico para performance
CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda_id ON public.vendas_itens(venda_id);

-- Dropar policy antiga
DROP POLICY IF EXISTS "Usuários podem ver itens de vendas acessíveis" ON public.vendas_itens;
DROP POLICY IF EXISTS "Usuários podem atualizar itens de suas vendas" ON public.vendas_itens;

-- Nova policy SELECT otimizada (herda acesso da venda pai)
CREATE POLICY "vendas_itens_select_otimizado" ON public.vendas_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
      )
      OR v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
    )
  )
);

-- Nova policy UPDATE otimizada
CREATE POLICY "vendas_itens_update_otimizado" ON public.vendas_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
      )
      OR v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
    )
  )
);

-- Nova policy INSERT otimizada
CREATE POLICY "vendas_itens_insert_otimizado" ON public.vendas_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
      )
      OR v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
    )
  )
);

-- Nova policy DELETE otimizada
CREATE POLICY "vendas_itens_delete_otimizado" ON public.vendas_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial')
      )
      OR v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
    )
  )
);