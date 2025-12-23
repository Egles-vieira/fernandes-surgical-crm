-- Enable realtime payloads for Kanban updates on oportunidades
ALTER TABLE public.oportunidades REPLICA IDENTITY FULL;

-- Add to realtime publication (no-op if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'oportunidades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.oportunidades;
  END IF;
END $$;