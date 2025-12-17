-- Adicionar coluna agente_ia_ativo na tabela whatsapp_conversas
-- Permite controle granular do agente IA por conversa

ALTER TABLE whatsapp_conversas 
ADD COLUMN IF NOT EXISTS agente_ia_ativo BOOLEAN DEFAULT true;

COMMENT ON COLUMN whatsapp_conversas.agente_ia_ativo IS 'Permite desativar o agente IA manualmente por conversa';