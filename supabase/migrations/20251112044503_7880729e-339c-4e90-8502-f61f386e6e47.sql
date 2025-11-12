-- Remover constraint antiga que verifica valores incorretos
ALTER TABLE whatsapp_contas 
  DROP CONSTRAINT IF EXISTS whatsapp_contas_provider_check;