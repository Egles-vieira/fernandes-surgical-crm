-- ============================================
-- FASE 1: Fundação da API Meta Cloud
-- Adicionar campos para subscription e token management
-- ============================================

-- Adicionar campos de subscription e token management à tabela whatsapp_contas
ALTER TABLE public.whatsapp_contas 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS subscribed_fields TEXT[] DEFAULT ARRAY['messages'],
ADD COLUMN IF NOT EXISTS subscription_verificado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_renovado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_renovacao_tentativas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_app_id TEXT,
ADD COLUMN IF NOT EXISTS signature_validation_enabled BOOLEAN DEFAULT false;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contas_token_expira ON public.whatsapp_contas(token_expira_em) WHERE token_expira_em IS NOT NULL;

-- Função para verificar tokens próximos de expirar (chamada via cron)
CREATE OR REPLACE FUNCTION public.verificar_tokens_whatsapp_expirando()
RETURNS TABLE(conta_id_out UUID, nome_conta_out VARCHAR, dias_restantes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.id AS conta_id_out,
    wc.nome_conta AS nome_conta_out,
    EXTRACT(DAY FROM (wc.token_expira_em - now()))::INTEGER AS dias_restantes
  FROM whatsapp_contas wc
  WHERE wc.token_expira_em IS NOT NULL
    AND wc.token_expira_em <= now() + INTERVAL '7 days'
    AND wc.excluido_em IS NULL
    AND wc.provedor = 'meta_cloud_api'
    AND (wc.token_alertado_em IS NULL OR wc.token_alertado_em < now() - INTERVAL '24 hours');
END;
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.whatsapp_contas.subscription_status IS 'Status da subscription do webhook: active, inactive, unknown';
COMMENT ON COLUMN public.whatsapp_contas.subscribed_fields IS 'Campos subscritos no webhook Meta';
COMMENT ON COLUMN public.whatsapp_contas.signature_validation_enabled IS 'Se a validação de assinatura está ativa para esta conta';