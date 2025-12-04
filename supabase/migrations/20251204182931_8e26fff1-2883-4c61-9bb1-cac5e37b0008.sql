-- Tornar bucket ged-documentos público para permitir visualização
UPDATE storage.buckets SET public = true WHERE id = 'ged-documentos';