-- Adicionar campos para armazenar a transportadora selecionada
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS transportadora_cod integer,
ADD COLUMN IF NOT EXISTS transportadora_nome text,
ADD COLUMN IF NOT EXISTS prazo_entrega_dias integer;