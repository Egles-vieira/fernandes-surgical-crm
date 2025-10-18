-- Adicionar campos de análise de sentimento na tabela whatsapp_conversas
ALTER TABLE whatsapp_conversas
ADD COLUMN IF NOT EXISTS sentimento_cliente VARCHAR(20),
ADD COLUMN IF NOT EXISTS emoji_sentimento VARCHAR(10),
ADD COLUMN IF NOT EXISTS ultima_analise_sentimento_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mensagens_analisadas INTEGER DEFAULT 0;

-- Criar índice para melhorar performance em consultas de sentimento
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_sentimento 
ON whatsapp_conversas(sentimento_cliente, ultima_analise_sentimento_em);