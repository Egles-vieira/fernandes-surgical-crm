-- 1. Substituir o whatsapp_contato_id nas conversas
UPDATE whatsapp_conversas
SET whatsapp_contato_id = '30945ea1-d8f4-4f2b-8762-a0d889d33170'
WHERE whatsapp_contato_id = 'e35c5026-e179-4d50-8567-77313a5f26d9';

-- 2. Substituir o whatsapp_contato_id nas mensagens
UPDATE whatsapp_mensagens
SET whatsapp_contato_id = '30945ea1-d8f4-4f2b-8762-a0d889d33170'
WHERE whatsapp_contato_id = 'e35c5026-e179-4d50-8567-77313a5f26d9';

-- 3. Agora deletar o registro whatsapp_contatos duplicado/órfão
DELETE FROM whatsapp_contatos
WHERE id = 'e35c5026-e179-4d50-8567-77313a5f26d9';