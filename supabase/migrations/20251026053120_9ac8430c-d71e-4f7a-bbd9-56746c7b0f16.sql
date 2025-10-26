-- Adicionar campo para marcar itens sem produtos disponíveis da CF
ALTER TABLE public.edi_cotacoes_itens 
  ADD COLUMN IF NOT EXISTS sem_produtos_cf boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_sem_produtos text;

-- Índice para facilitar busca de itens sem produtos
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_sem_produtos 
  ON public.edi_cotacoes_itens(sem_produtos_cf) 
  WHERE sem_produtos_cf = true;

-- Comentários para documentação
COMMENT ON COLUMN public.edi_cotacoes_itens.sem_produtos_cf IS 'Flag indicando que não foram encontrados produtos da CF Fernandes compatíveis com a solicitação';
COMMENT ON COLUMN public.edi_cotacoes_itens.motivo_sem_produtos IS 'Descrição do motivo de não ter encontrado produtos (ex: categoria não disponível, especificação incompatível)';