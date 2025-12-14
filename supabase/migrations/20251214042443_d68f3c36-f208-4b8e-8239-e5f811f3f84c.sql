-- Tabela para armazenar phone numbers da Meta
CREATE TABLE public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES whatsapp_contas(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT NOT NULL,
  verified_name TEXT,
  quality_rating TEXT, -- GREEN, YELLOW, RED
  name_status TEXT, -- APPROVED, PENDING, DECLINED, NONE
  code_verification_status TEXT,
  platform_type TEXT,
  throughput_level TEXT,
  is_registered BOOLEAN DEFAULT false,
  is_principal BOOLEAN DEFAULT false,
  ultima_sincronizacao_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT whatsapp_phone_numbers_unique UNIQUE(conta_id, phone_number_id)
);

-- Índices
CREATE INDEX idx_whatsapp_phone_numbers_conta ON whatsapp_phone_numbers(conta_id);
CREATE INDEX idx_whatsapp_phone_numbers_quality ON whatsapp_phone_numbers(quality_rating);
CREATE INDEX idx_whatsapp_phone_numbers_principal ON whatsapp_phone_numbers(conta_id, is_principal) WHERE is_principal = true;

-- RLS
ALTER TABLE whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;

-- SELECT: todos autenticados podem ver
CREATE POLICY "whatsapp_phone_numbers_select" ON whatsapp_phone_numbers
FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: apenas admin/manager
CREATE POLICY "whatsapp_phone_numbers_manage" ON whatsapp_phone_numbers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

-- Adicionar campo na whatsapp_contas para última sincronização de números
ALTER TABLE whatsapp_contas 
ADD COLUMN IF NOT EXISTS phone_numbers_sincronizados_em TIMESTAMPTZ;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_phone_numbers_updated_at
BEFORE UPDATE ON whatsapp_phone_numbers
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_phone_numbers_updated_at();