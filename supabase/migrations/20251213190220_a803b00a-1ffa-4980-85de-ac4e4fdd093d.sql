-- FASE 1.3: Sistema de Alerta de Token
-- Adicionar campo de expiração de token na tabela whatsapp_contas
ALTER TABLE whatsapp_contas 
ADD COLUMN IF NOT EXISTS token_expira_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_alertado_em TIMESTAMP WITH TIME ZONE;

-- Criar tabela de log de tokens para auditoria
CREATE TABLE IF NOT EXISTS whatsapp_tokens_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_conta_id UUID NOT NULL REFERENCES whatsapp_contas(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(50) NOT NULL, -- 'renovado', 'expirado', 'alerta_enviado'
  token_anterior_hash VARCHAR(64), -- Hash para comparação sem expor token
  detalhes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_tokens_log_conta 
ON whatsapp_tokens_log(whatsapp_conta_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_tokens_log_tipo 
ON whatsapp_tokens_log(tipo_evento, criado_em DESC);

-- Habilitar RLS
ALTER TABLE whatsapp_tokens_log ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins e managers podem ver logs de tokens
CREATE POLICY "whatsapp_tokens_log_admin_select" ON whatsapp_tokens_log
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'manager', 'gerente_comercial', 'diretor_comercial')
  )
);

-- View para alertas de tokens expirando
CREATE OR REPLACE VIEW vw_whatsapp_tokens_expirando AS
SELECT 
  wc.id,
  wc.nome_conta,
  wc.provedor,
  wc.token_expira_em,
  wc.token_alertado_em,
  CASE 
    WHEN wc.token_expira_em IS NULL THEN 'desconhecido'
    WHEN wc.token_expira_em < now() THEN 'expirado'
    WHEN wc.token_expira_em < now() + INTERVAL '7 days' THEN 'expirando'
    ELSE 'ok'
  END as status_token,
  EXTRACT(DAY FROM (wc.token_expira_em - now())) as dias_restantes
FROM whatsapp_contas wc
WHERE wc.excluido_em IS NULL
  AND wc.provedor = 'meta_cloud_api'
  AND (wc.token_expira_em IS NULL OR wc.token_expira_em < now() + INTERVAL '7 days');

-- Conceder permissões
GRANT SELECT ON vw_whatsapp_tokens_expirando TO authenticated;

COMMENT ON TABLE whatsapp_tokens_log IS 'Log de eventos de tokens do WhatsApp (renovação, expiração, alertas)';
COMMENT ON VIEW vw_whatsapp_tokens_expirando IS 'View para monitorar tokens do Meta Cloud API próximos de expirar';