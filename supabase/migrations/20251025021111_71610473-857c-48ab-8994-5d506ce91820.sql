-- Adicionar campo marca_cliente na tabela edi_cotacoes_itens
ALTER TABLE public.edi_cotacoes_itens 
ADD COLUMN marca_cliente VARCHAR(255);

-- Adicionar índice para facilitar buscas por marca
CREATE INDEX idx_edi_itens_marca ON public.edi_cotacoes_itens(marca_cliente);