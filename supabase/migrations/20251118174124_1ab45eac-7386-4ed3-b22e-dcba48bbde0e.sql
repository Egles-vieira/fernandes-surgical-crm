-- Adicionar campo cod_emitente na tabela vendas
ALTER TABLE vendas 
ADD COLUMN cod_emitente INTEGER DEFAULT 0;

-- Criar tabela de log de integrações TOTVS
CREATE TABLE integracoes_totvs_calcula_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
  numero_venda TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'erro')),
  error_message TEXT,
  tempo_resposta_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar índices para performance
CREATE INDEX idx_integracoes_totvs_venda_id ON integracoes_totvs_calcula_pedido(venda_id);
CREATE INDEX idx_integracoes_totvs_numero_venda ON integracoes_totvs_calcula_pedido(numero_venda);
CREATE INDEX idx_integracoes_totvs_status ON integracoes_totvs_calcula_pedido(status);
CREATE INDEX idx_integracoes_totvs_created_at ON integracoes_totvs_calcula_pedido(created_at);

-- Habilitar RLS
ALTER TABLE integracoes_totvs_calcula_pedido ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Usuários comerciais podem visualizar logs
CREATE POLICY "Usuários comerciais podem visualizar logs"
  ON integracoes_totvs_calcula_pedido
  FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
  );

-- RLS Policy: Sistema pode inserir logs (via Edge Function)
CREATE POLICY "Sistema pode inserir logs"
  ON integracoes_totvs_calcula_pedido
  FOR INSERT
  WITH CHECK (true);