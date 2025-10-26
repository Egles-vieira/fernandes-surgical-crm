-- Adicionar coluna de tags na tabela edi_cotacoes
ALTER TABLE public.edi_cotacoes 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];

-- Criar índice para busca em tags
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_tags ON public.edi_cotacoes USING GIN(tags);

-- Comentário na coluna
COMMENT ON COLUMN public.edi_cotacoes.tags IS 'Tags para categorização das cotações (ex: "Sem produtos CF", "Urgente", etc.)';