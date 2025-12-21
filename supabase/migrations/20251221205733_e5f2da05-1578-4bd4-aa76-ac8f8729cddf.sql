-- Tornar numero_venda nullable para permitir logs de oportunidades
ALTER TABLE public.integracoes_totvs_calcula_pedido 
ALTER COLUMN numero_venda DROP NOT NULL;

-- Adicionar índice para oportunidade_id se não existir
CREATE INDEX IF NOT EXISTS idx_integracoes_totvs_calcula_pedido_oportunidade_id 
ON public.integracoes_totvs_calcula_pedido(oportunidade_id);