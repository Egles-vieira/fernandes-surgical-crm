
-- =====================================================
-- LIBERA ACESSO A RESPOSTAS DE PROPOSTAS PARA O VENDEDOR DO CLIENTE
-- =====================================================

DROP POLICY IF EXISTS "propostas_respostas_select" ON propostas_respostas;
DROP POLICY IF EXISTS "Usuários podem ver respostas de suas propostas" ON propostas_respostas;

CREATE POLICY "propostas_respostas_select" ON propostas_respostas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = propostas_respostas.venda_id
    AND (
      v.vendedor_id = auth.uid()
      OR v.user_id = auth.uid()
      OR c.vendedor_id = auth.uid()
    )
  )
  OR auth_check_high_hierarchy()
);
