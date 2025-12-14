-- Make whatsapp-media bucket public for Meta API access
UPDATE storage.buckets 
SET public = true 
WHERE name = 'whatsapp-media';