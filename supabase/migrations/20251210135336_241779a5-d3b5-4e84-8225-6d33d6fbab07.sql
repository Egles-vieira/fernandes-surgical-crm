
-- =====================================================
-- LIBERA ACESSO A ANALYTICS DE PROPOSTAS PARA O VENDEDOR DO CLIENTE
-- =====================================================

-- 1. PROPOSTAS_ANALYTICS - SELECT
DROP POLICY IF EXISTS "propostas_analytics_select" ON propostas_analytics;
DROP POLICY IF EXISTS "Usuários podem ver analytics de suas propostas" ON propostas_analytics;

CREATE POLICY "propostas_analytics_select" ON propostas_analytics
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = propostas_analytics.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- 2. PROPOSTAS_ANALYTICS_CLIQUES - SELECT
DROP POLICY IF EXISTS "propostas_analytics_cliques_select" ON propostas_analytics_cliques;
DROP POLICY IF EXISTS "Usuários podem ver cliques de suas propostas" ON propostas_analytics_cliques;

CREATE POLICY "propostas_analytics_cliques_select" ON propostas_analytics_cliques
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM propostas_analytics pa
    JOIN vendas v ON v.id = pa.venda_id
    JOIN clientes c ON c.id = v.cliente_id
    WHERE pa.id = propostas_analytics_cliques.analytics_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- 3. PROPOSTAS_ANALYTICS_SECOES - SELECT
DROP POLICY IF EXISTS "propostas_analytics_secoes_select" ON propostas_analytics_secoes;
DROP POLICY IF EXISTS "Usuários podem ver seções de suas propostas" ON propostas_analytics_secoes;

CREATE POLICY "propostas_analytics_secoes_select" ON propostas_analytics_secoes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM propostas_analytics pa
    JOIN vendas v ON v.id = pa.venda_id
    JOIN clientes c ON c.id = v.cliente_id
    WHERE pa.id = propostas_analytics_secoes.analytics_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

-- 4. PROPOSTAS_PUBLICAS_TOKENS - SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "propostas_publicas_tokens_select" ON propostas_publicas_tokens;
DROP POLICY IF EXISTS "propostas_publicas_tokens_insert" ON propostas_publicas_tokens;
DROP POLICY IF EXISTS "propostas_publicas_tokens_update" ON propostas_publicas_tokens;
DROP POLICY IF EXISTS "Usuários podem ver tokens de suas propostas" ON propostas_publicas_tokens;
DROP POLICY IF EXISTS "Usuários podem criar tokens para suas propostas" ON propostas_publicas_tokens;

CREATE POLICY "propostas_publicas_tokens_select" ON propostas_publicas_tokens
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = propostas_publicas_tokens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

CREATE POLICY "propostas_publicas_tokens_insert" ON propostas_publicas_tokens
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = propostas_publicas_tokens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);

CREATE POLICY "propostas_publicas_tokens_update" ON propostas_publicas_tokens
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = propostas_publicas_tokens.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);
