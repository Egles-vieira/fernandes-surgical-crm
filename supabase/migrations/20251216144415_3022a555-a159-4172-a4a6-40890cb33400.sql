-- Remover constraint que impede múltiplos números WhatsApp por contato CRM
-- (uma pessoa pode ter múltiplos números de telefone)
ALTER TABLE whatsapp_contatos 
DROP CONSTRAINT IF EXISTS whatsapp_contatos_contato_id_whatsapp_conta_id_key;