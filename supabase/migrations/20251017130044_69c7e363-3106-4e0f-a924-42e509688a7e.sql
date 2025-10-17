-- Habilitar Supabase Realtime para WhatsApp
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_contatos;