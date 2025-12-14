-- =============================================
-- FASE 4: Mensagens Avançadas - Reply, Reaction, Mark as Read
-- =============================================

-- 1. Campo para resposta (reply) - FK para mensagem original
ALTER TABLE whatsapp_mensagens 
ADD COLUMN IF NOT EXISTS resposta_para_id UUID REFERENCES whatsapp_mensagens(id);

-- 2. Tabela de reações (uma mensagem pode ter múltiplas reações de diferentes pessoas)
CREATE TABLE IF NOT EXISTS whatsapp_reacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id UUID NOT NULL REFERENCES whatsapp_mensagens(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  reagido_por_tipo VARCHAR(20) NOT NULL CHECK (reagido_por_tipo IN ('usuario', 'contato')),
  reagido_por_usuario_id UUID REFERENCES perfis_usuario(id),
  reagido_por_contato_id UUID REFERENCES whatsapp_contatos(id),
  mensagem_externa_id VARCHAR(255),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  -- Cada pessoa só pode ter uma reação por mensagem
  CONSTRAINT unique_reaction_per_user UNIQUE NULLS NOT DISTINCT (mensagem_id, reagido_por_usuario_id),
  CONSTRAINT unique_reaction_per_contact UNIQUE NULLS NOT DISTINCT (mensagem_id, reagido_por_contato_id)
);

-- 3. RLS para reações
ALTER TABLE whatsapp_reacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_reacoes_select_authenticated" 
ON whatsapp_reacoes FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "whatsapp_reacoes_insert_authenticated" 
ON whatsapp_reacoes FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "whatsapp_reacoes_update_own" 
ON whatsapp_reacoes FOR UPDATE TO authenticated 
USING (reagido_por_usuario_id = auth.uid());

CREATE POLICY "whatsapp_reacoes_delete_own" 
ON whatsapp_reacoes FOR DELETE TO authenticated 
USING (reagido_por_usuario_id = auth.uid());

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_resposta_para 
ON whatsapp_mensagens(resposta_para_id) WHERE resposta_para_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_reacoes_mensagem 
ON whatsapp_reacoes(mensagem_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reacoes_usuario 
ON whatsapp_reacoes(reagido_por_usuario_id) WHERE reagido_por_usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_reacoes_contato 
ON whatsapp_reacoes(reagido_por_contato_id) WHERE reagido_por_contato_id IS NOT NULL;

-- 5. Trigger para atualizar timestamp
CREATE TRIGGER update_whatsapp_reacoes_updated_at
BEFORE UPDATE ON whatsapp_reacoes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Campo para marcar quando mensagem foi lida (confirmação Meta)
ALTER TABLE whatsapp_mensagens 
ADD COLUMN IF NOT EXISTS lida_confirmada_em TIMESTAMPTZ;

-- 7. Habilitar Realtime para reações
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_reacoes;