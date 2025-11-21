-- Criar bucket para armazenar mídias do WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-midias',
  'whatsapp-midias',
  true,
  52428800, -- 50MB
  ARRAY['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket
CREATE POLICY "Qualquer um pode ver mídias do WhatsApp"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-midias');

CREATE POLICY "Usuários autenticados podem fazer upload de mídias"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-midias' AND auth.role() = 'authenticated');

CREATE POLICY "Service role pode gerenciar todas as mídias"
ON storage.objects FOR ALL
USING (bucket_id = 'whatsapp-midias' AND auth.role() = 'service_role');