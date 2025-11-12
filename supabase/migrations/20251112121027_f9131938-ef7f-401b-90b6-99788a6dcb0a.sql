-- Adicionar campos para reações, edições e botões interativos
ALTER TABLE whatsapp_mensagens
ADD COLUMN IF NOT EXISTS reacoes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS editada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS editada_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mensagem_original TEXT,
ADD COLUMN IF NOT EXISTS deletada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deletada_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS botoes_interativos JSONB,
ADD COLUMN IF NOT EXISTS tipo_botao TEXT CHECK (tipo_botao IN ('action', 'list', 'reply'));

-- Comentários descritivos
COMMENT ON COLUMN whatsapp_mensagens.reacoes IS 'Array de reações: [{emoji: "👍", usuario_id: "uuid", criado_em: "timestamp"}]';
COMMENT ON COLUMN whatsapp_mensagens.editada IS 'Indica se a mensagem foi editada';
COMMENT ON COLUMN whatsapp_mensagens.mensagem_original IS 'Texto original antes da edição';
COMMENT ON COLUMN whatsapp_mensagens.deletada IS 'Soft delete - mensagem deletada';
COMMENT ON COLUMN whatsapp_mensagens.botoes_interativos IS 'Estrutura de botões: {tipo: "action|list", botoes: [...]}';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_reacoes ON whatsapp_mensagens USING GIN (reacoes);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_deletada ON whatsapp_mensagens (deletada) WHERE deletada = false;