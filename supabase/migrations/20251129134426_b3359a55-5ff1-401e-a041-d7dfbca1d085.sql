-- Adicionar campo endereco_entrega_id na tabela vendas
ALTER TABLE public.vendas
ADD COLUMN endereco_entrega_id uuid REFERENCES enderecos_clientes(id);

-- Índice para melhor performance nas consultas
CREATE INDEX idx_vendas_endereco_entrega ON public.vendas(endereco_entrega_id);