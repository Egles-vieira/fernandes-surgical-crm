-- ============================================================================
-- FASE 1: ARQUITETURA MULTI-API WHATSAPP
-- ============================================================================

-- 1.1 Criar tabela de configuração global
CREATE TABLE whatsapp_configuracao_global (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Modo de Operação
    modo_api VARCHAR(20) NOT NULL CHECK (modo_api IN ('oficial', 'nao_oficial')),
    
    -- Provedor ativo
    provedor_ativo VARCHAR(50) NOT NULL CHECK (
        provedor_ativo IN ('gupshup', 'w_api')
    ),
    
    -- Status
    esta_ativo BOOLEAN DEFAULT true,
    configurado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    configurado_por UUID NOT NULL REFERENCES auth.users(id),
    
    -- Metadados
    observacoes TEXT
);

-- Criar índice único parcial para garantir apenas 1 config ativa
CREATE UNIQUE INDEX idx_unico_config_ativa 
ON whatsapp_configuracao_global(esta_ativo) 
WHERE esta_ativo = true;

-- Índice de performance
CREATE INDEX idx_config_global_ativa 
ON whatsapp_configuracao_global(esta_ativo) 
WHERE esta_ativo = true;

-- RLS Policies
ALTER TABLE whatsapp_configuracao_global ENABLE ROW LEVEL SECURITY;

-- Todos podem ver a config ativa
CREATE POLICY "Todos podem ver config ativa" 
ON whatsapp_configuracao_global FOR SELECT 
USING (esta_ativo = true);

-- Apenas admins podem modificar
CREATE POLICY "Apenas admins podem modificar config" 
ON whatsapp_configuracao_global FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 1.2 Expandir tabela whatsapp_contas
-- ADICIONAR COLUNAS PARA IDENTIFICAR PROVEDOR
ALTER TABLE whatsapp_contas 
ADD COLUMN IF NOT EXISTS provedor VARCHAR(50) 
  CHECK (provedor IN ('gupshup', 'w_api'));

-- ADICIONAR COLUNAS PARA W-API
ALTER TABLE whatsapp_contas 
ADD COLUMN IF NOT EXISTS instance_id_wapi VARCHAR(255),
ADD COLUMN IF NOT EXISTS token_wapi TEXT,
ADD COLUMN IF NOT EXISTS webhook_received_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_delivery_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_status_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_connected_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_disconnected_url TEXT;

-- RENOMEAR COLUNAS EXISTENTES DO GUPSHUP (se existirem)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contas' AND column_name = 'app_id') THEN
    ALTER TABLE whatsapp_contas RENAME COLUMN app_id TO app_id_gupshup;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contas' AND column_name = 'api_key') THEN
    ALTER TABLE whatsapp_contas RENAME COLUMN api_key TO api_key_gupshup;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contas' AND column_name = 'phone_number_id') THEN
    ALTER TABLE whatsapp_contas RENAME COLUMN phone_number_id TO phone_number_id_gupshup;
  END IF;
END $$;

-- Atualizar contas existentes para Gupshup
UPDATE whatsapp_contas 
SET provedor = 'gupshup' 
WHERE provedor IS NULL;

-- Tornar provedor obrigatório (apenas se houver dados)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM whatsapp_contas LIMIT 1) THEN
    ALTER TABLE whatsapp_contas 
    ALTER COLUMN provedor SET NOT NULL;
  END IF;
END $$;

-- Índice para provedor
CREATE INDEX IF NOT EXISTS idx_whatsapp_contas_provedor 
ON whatsapp_contas(provedor) 
WHERE excluido_em IS NULL;

-- 1.3 Atualizar tabela whatsapp_webhooks_log
-- Renomear coluna provider para provedor se existir
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_webhooks_log' AND column_name = 'provider') THEN
    ALTER TABLE whatsapp_webhooks_log RENAME COLUMN provider TO provedor;
  END IF;
END $$;

-- Adicionar coluna provedor se não existir
ALTER TABLE whatsapp_webhooks_log 
ADD COLUMN IF NOT EXISTS provedor VARCHAR(50);

-- Atualizar constraint se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'whatsapp_webhooks_log' AND constraint_name = 'check_provedor'
  ) THEN
    ALTER TABLE whatsapp_webhooks_log DROP CONSTRAINT check_provedor;
  END IF;
  
  ALTER TABLE whatsapp_webhooks_log 
  ADD CONSTRAINT check_provedor CHECK (
      provedor IN ('gupshup', 'w_api')
  );
END $$;

-- Inserir configuração padrão (Gupshup como oficial)
INSERT INTO whatsapp_configuracao_global (
    modo_api, provedor_ativo, esta_ativo, configurado_por, observacoes
) 
SELECT 'oficial', 'gupshup', true, id, 'Configuração inicial do sistema'
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;