-- Atualizar políticas RLS para permitir vendedores gerenciar itens de cotação

-- Remover política antiga de edi_cotacoes_itens
DROP POLICY IF EXISTS "Usuários podem gerenciar itens de cotação" ON edi_cotacoes_itens;

-- Criar nova política permitindo sales visualizar itens
CREATE POLICY "Usuários podem visualizar itens de cotação"
ON edi_cotacoes_itens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM edi_cotacoes
    WHERE edi_cotacoes.id = edi_cotacoes_itens.cotacao_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
      OR edi_cotacoes.resgatada_por = auth.uid()
    )
  )
);

-- Criar política permitindo sales inserir itens
CREATE POLICY "Usuários podem inserir itens de cotação"
ON edi_cotacoes_itens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM edi_cotacoes
    WHERE edi_cotacoes.id = edi_cotacoes_itens.cotacao_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
      OR edi_cotacoes.resgatada_por = auth.uid()
    )
  )
);

-- Criar política permitindo sales atualizar itens
CREATE POLICY "Usuários podem atualizar itens de cotação"
ON edi_cotacoes_itens
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM edi_cotacoes
    WHERE edi_cotacoes.id = edi_cotacoes_itens.cotacao_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
      OR edi_cotacoes.resgatada_por = auth.uid()
    )
  )
);

-- Criar política permitindo admin/manager deletar itens
CREATE POLICY "Admins podem deletar itens de cotação"
ON edi_cotacoes_itens
FOR DELETE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);