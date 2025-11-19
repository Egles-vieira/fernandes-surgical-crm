-- Adicionar campos do retorno Datasul por item em vendas_itens
ALTER TABLE vendas_itens 
ADD COLUMN IF NOT EXISTS datasul_dep_exp INTEGER,
ADD COLUMN IF NOT EXISTS datasul_custo NUMERIC(15,6),
ADD COLUMN IF NOT EXISTS datasul_divisao NUMERIC(15,6),
ADD COLUMN IF NOT EXISTS datasul_vl_tot_item NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS datasul_vl_merc_liq NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS datasul_lote_mulven INTEGER;

COMMENT ON COLUMN vendas_itens.datasul_dep_exp IS 'Depósito/expedição retornado pelo cálculo Datasul';
COMMENT ON COLUMN vendas_itens.datasul_custo IS 'Custo unitário retornado pelo cálculo Datasul';
COMMENT ON COLUMN vendas_itens.datasul_divisao IS 'Divisão retornada pelo cálculo Datasul';
COMMENT ON COLUMN vendas_itens.datasul_vl_tot_item IS 'Valor total do item retornado pelo cálculo Datasul';
COMMENT ON COLUMN vendas_itens.datasul_vl_merc_liq IS 'Valor mercadoria líquida retornado pelo cálculo Datasul';
COMMENT ON COLUMN vendas_itens.datasul_lote_mulven IS 'Lote múltiplo de venda retornado pelo cálculo Datasul';