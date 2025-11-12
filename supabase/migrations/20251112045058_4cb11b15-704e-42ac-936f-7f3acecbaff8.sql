-- Enable realtime for WhatsApp tables and ensure full row data in change events
-- Set REPLICA IDENTITY FULL so updates include previous values
ALTER TABLE public.whatsapp_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_conversas REPLICA IDENTITY FULL;

-- Safely add tables to the realtime publication (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensagens;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;