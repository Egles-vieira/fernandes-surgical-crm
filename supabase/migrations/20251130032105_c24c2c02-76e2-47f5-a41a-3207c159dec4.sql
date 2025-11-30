-- Adicionar coluna para frete rateado por item
ALTER TABLE public.vendas_itens 
ADD COLUMN IF NOT EXISTS frete_rateado numeric(10,2) DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.vendas_itens.frete_rateado IS 'Valor do frete rateado para este item (usado em CIF incluso na NF)';