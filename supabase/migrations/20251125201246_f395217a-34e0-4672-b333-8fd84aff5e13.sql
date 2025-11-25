
-- Primeiro, remover o default da coluna
ALTER TABLE whatsapp_conversas
ALTER COLUMN produtos_carrinho DROP DEFAULT;

-- Agora alterar o tipo para JSONB (sem converter valores existentes ainda)
ALTER TABLE whatsapp_conversas
ALTER COLUMN produtos_carrinho TYPE JSONB USING '[]'::jsonb;

-- Definir novo default como array JSON vazio
ALTER TABLE whatsapp_conversas
ALTER COLUMN produtos_carrinho SET DEFAULT '[]'::jsonb;
