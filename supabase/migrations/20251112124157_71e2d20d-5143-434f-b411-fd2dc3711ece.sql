-- Tornar contato_id opcional em whatsapp_contatos
-- Mensagens do WhatsApp podem vir de números não cadastrados no CRM
ALTER TABLE whatsapp_contatos 
ALTER COLUMN contato_id DROP NOT NULL;