-- FASE 1.1: Atualizar check constraint para incluir Meta Cloud API
ALTER TABLE whatsapp_configuracao_global 
DROP CONSTRAINT whatsapp_configuracao_global_provedor_ativo_check;

ALTER TABLE whatsapp_configuracao_global 
ADD CONSTRAINT whatsapp_configuracao_global_provedor_ativo_check 
CHECK (provedor_ativo IN ('gupshup', 'w_api', 'meta_cloud_api'));