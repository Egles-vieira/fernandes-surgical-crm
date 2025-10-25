-- Criar tabela para histórico de ligações
CREATE TABLE historico_ligacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES contatos(id) ON DELETE SET NULL,
  numero_destino VARCHAR NOT NULL,
  nome_contato VARCHAR,
  iniciada_por UUID REFERENCES auth.users(id),
  iniciada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Dados da Zenvia
  id_chamada_externa VARCHAR,
  status VARCHAR DEFAULT 'iniciando', -- iniciando, chamando, atendida, nao_atendida, ocupado, erro
  duracao_segundos INTEGER,
  atendida BOOLEAN,
  
  -- Timestamps de eventos
  chamada_iniciada_em TIMESTAMP WITH TIME ZONE,
  chamada_atendida_em TIMESTAMP WITH TIME ZONE,
  chamada_encerrada_em TIMESTAMP WITH TIME ZONE,
  
  -- Dados adicionais
  motivo_falha TEXT,
  dados_webhook JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_historico_ligacoes_cliente ON historico_ligacoes(cliente_id);
CREATE INDEX idx_historico_ligacoes_contato ON historico_ligacoes(contato_id);
CREATE INDEX idx_historico_ligacoes_iniciada_por ON historico_ligacoes(iniciada_por);
CREATE INDEX idx_historico_ligacoes_status ON historico_ligacoes(status);
CREATE INDEX idx_historico_ligacoes_id_externa ON historico_ligacoes(id_chamada_externa);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_historico_ligacoes_updated_at
  BEFORE UPDATE ON historico_ligacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE historico_ligacoes ENABLE ROW LEVEL SECURITY;

-- Usuários podem visualizar histórico de ligações
CREATE POLICY "Usuários podem visualizar histórico de ligações"
  ON historico_ligacoes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
  );

-- Usuários podem criar registros de ligações
CREATE POLICY "Usuários podem criar registros de ligações"
  ON historico_ligacoes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
  );

-- Sistema pode atualizar registros (para webhooks)
CREATE POLICY "Sistema pode atualizar registros de ligações"
  ON historico_ligacoes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);