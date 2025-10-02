-- Tornar campos opcionais na tabela clientes para testes
ALTER TABLE public.clientes 
  ALTER COLUMN nome_emit DROP NOT NULL,
  ALTER COLUMN nome_abrev DROP NOT NULL,
  ALTER COLUMN cgc DROP NOT NULL,
  ALTER COLUMN cod_emitente DROP NOT NULL,
  ALTER COLUMN cod_emitente SET DEFAULT 0;