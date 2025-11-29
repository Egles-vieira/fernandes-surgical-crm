-- Adicionar campo api_tipo_frete na tabela tipos_frete
ALTER TABLE public.tipos_frete 
ADD COLUMN IF NOT EXISTS api_tipo_frete TEXT DEFAULT 'cif' CHECK (api_tipo_frete IN ('cif', 'fob', 'sem_frete'));

-- Atualizar tipos existentes baseado no nome
UPDATE public.tipos_frete SET api_tipo_frete = 'cif' WHERE nome ILIKE '%CIF%';
UPDATE public.tipos_frete SET api_tipo_frete = 'fob' WHERE nome ILIKE '%FOB%';
UPDATE public.tipos_frete SET api_tipo_frete = 'sem_frete' WHERE nome ILIKE '%Sem Frete%';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.tipos_frete.api_tipo_frete IS 'Define qual API Datasul usar: cif = /calcula-frete, fob = /calcula-frete-fob, sem_frete = não chama API';