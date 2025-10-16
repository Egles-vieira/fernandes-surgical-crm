-- =====================================================
-- INTEGRAÇÃO CLIENTES, CONTAS E CONTATOS
-- =====================================================

-- 1. Adicionar campo de relacionamento entre clientes e contas
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES contas(id);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_conta ON clientes(conta_id) WHERE conta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);

-- 3. Atualizar RLS policies para contas considerando a vinculação com usuários
DROP POLICY IF EXISTS "Usuários podem visualizar contas" ON contas;
CREATE POLICY "Usuários podem visualizar contas"
  ON contas FOR SELECT
  USING (
    (excluido_em IS NULL) AND 
    (proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]))
  );

-- 4. Adicionar trigger para sincronizar nome_conta quando criar/atualizar cliente
CREATE OR REPLACE FUNCTION sync_cliente_conta()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o cliente tem uma conta vinculada, atualizar dados da conta
  IF NEW.conta_id IS NOT NULL THEN
    UPDATE contas
    SET 
      nome_conta = COALESCE(NEW.nome_abrev, nome_conta),
      cnpj = COALESCE(NEW.cgc, cnpj),
      atualizado_em = now()
    WHERE id = NEW.conta_id;
  ELSE
    -- Se não tem conta vinculada, criar uma nova conta
    INSERT INTO contas (
      nome_conta,
      cnpj,
      tipo_conta,
      setor,
      proprietario_id,
      esta_ativa,
      criado_por
    ) VALUES (
      NEW.nome_abrev,
      NEW.cgc,
      'cliente',
      NEW.atividade,
      NEW.user_id,
      true,
      NEW.user_id
    )
    RETURNING id INTO NEW.conta_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Criar trigger para executar a sincronização
DROP TRIGGER IF EXISTS trigger_sync_cliente_conta ON clientes;
CREATE TRIGGER trigger_sync_cliente_conta
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION sync_cliente_conta();

-- 6. Migrar clientes existentes para contas (se ainda não tiverem)
INSERT INTO contas (
  nome_conta,
  cnpj,
  tipo_conta,
  setor,
  proprietario_id,
  esta_ativa,
  criado_em,
  criado_por
)
SELECT 
  c.nome_abrev,
  c.cgc,
  'cliente',
  c.atividade,
  c.user_id,
  true,
  c.created_at,
  c.user_id
FROM clientes c
WHERE c.conta_id IS NULL AND c.nome_abrev IS NOT NULL
ON CONFLICT DO NOTHING
RETURNING id, nome_conta;

-- 7. Atualizar clientes com as contas criadas
UPDATE clientes c
SET conta_id = co.id
FROM contas co
WHERE c.conta_id IS NULL 
  AND c.nome_abrev = co.nome_conta 
  AND c.user_id = co.proprietario_id;

-- 8. Adicionar campo cliente_id em contatos para facilitar queries
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);
CREATE INDEX IF NOT EXISTS idx_contatos_cliente ON contatos(cliente_id) WHERE cliente_id IS NOT NULL;

-- 9. Criar view para facilitar consultas integradas
CREATE OR REPLACE VIEW vw_clientes_completo AS
SELECT 
  c.id as cliente_id,
  c.nome_abrev,
  c.nome_emit,
  c.cgc,
  c.ins_estadual,
  c.telefone1,
  c.e_mail,
  c.lim_credito,
  c.limite_disponivel,
  c.user_id,
  co.id as conta_id,
  co.nome_conta,
  co.tipo_conta,
  co.setor,
  co.receita_anual,
  co.numero_funcionarios,
  co.site,
  co.classificacao,
  co.estagio_ciclo_vida,
  co.origem_lead,
  co.proprietario_id,
  (
    SELECT json_agg(
      json_build_object(
        'id', ct.id,
        'nome_completo', ct.nome_completo,
        'email', ct.email,
        'telefone', ct.telefone,
        'celular', ct.celular,
        'cargo', ct.cargo,
        'departamento', ct.departamento,
        'status_lead', ct.status_lead,
        'esta_ativo', ct.esta_ativo
      )
    )
    FROM contatos ct
    WHERE ct.conta_id = co.id AND ct.excluido_em IS NULL
  ) as contatos
FROM clientes c
LEFT JOIN contas co ON c.conta_id = co.id
WHERE c.user_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]);

-- 10. Garantir que contatos possam ser vinculados via cliente_id também
CREATE OR REPLACE FUNCTION sync_contato_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o contato tem conta_id, buscar o cliente correspondente
  IF NEW.conta_id IS NOT NULL AND NEW.cliente_id IS NULL THEN
    SELECT id INTO NEW.cliente_id
    FROM clientes
    WHERE conta_id = NEW.conta_id
    LIMIT 1;
  END IF;
  
  -- Se tem cliente_id mas não tem conta_id, pegar da relação
  IF NEW.cliente_id IS NOT NULL AND NEW.conta_id IS NULL THEN
    SELECT conta_id INTO NEW.conta_id
    FROM clientes
    WHERE id = NEW.cliente_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_contato_cliente ON contatos;
CREATE TRIGGER trigger_sync_contato_cliente
  BEFORE INSERT OR UPDATE ON contatos
  FOR EACH ROW
  EXECUTE FUNCTION sync_contato_cliente();