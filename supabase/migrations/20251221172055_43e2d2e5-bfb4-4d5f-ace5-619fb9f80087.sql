-- ============================================================
-- INTEGRAÇÃO DATASUL PARA OPORTUNIDADES
-- ============================================================

-- 1. Adicionar campos Datasul na tabela itens_linha_oportunidade
ALTER TABLE public.itens_linha_oportunidade 
ADD COLUMN IF NOT EXISTS datasul_dep_exp NUMERIC(15,4),
ADD COLUMN IF NOT EXISTS datasul_custo NUMERIC(15,4),
ADD COLUMN IF NOT EXISTS datasul_divisao NUMERIC(15,4),
ADD COLUMN IF NOT EXISTS datasul_vl_tot_item NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS datasul_vl_merc_liq NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS datasul_lote_mulven INTEGER;

COMMENT ON COLUMN public.itens_linha_oportunidade.datasul_dep_exp IS 'Depósito de expedição retornado pelo Datasul';
COMMENT ON COLUMN public.itens_linha_oportunidade.datasul_custo IS 'Custo do item retornado pelo Datasul';
COMMENT ON COLUMN public.itens_linha_oportunidade.datasul_divisao IS 'Divisão do item retornada pelo Datasul';
COMMENT ON COLUMN public.itens_linha_oportunidade.datasul_vl_tot_item IS 'Valor total do item retornado pelo Datasul';
COMMENT ON COLUMN public.itens_linha_oportunidade.datasul_vl_merc_liq IS 'Valor mercadoria líquido retornado pelo Datasul';
COMMENT ON COLUMN public.itens_linha_oportunidade.datasul_lote_mulven IS 'Lote mulven retornado pelo Datasul';

-- 2. Adicionar suporte a oportunidades na tabela de logs
ALTER TABLE public.integracoes_totvs_calcula_pedido 
ADD COLUMN IF NOT EXISTS oportunidade_id UUID REFERENCES public.oportunidades(id),
ADD COLUMN IF NOT EXISTS codigo_oportunidade TEXT;

CREATE INDEX IF NOT EXISTS idx_integracoes_totvs_oportunidade_id 
ON public.integracoes_totvs_calcula_pedido(oportunidade_id);

-- 3. Criar função RPC para batch update de itens de oportunidade
CREATE OR REPLACE FUNCTION public.batch_update_itens_oportunidade(
  p_oportunidade_id UUID,
  p_items JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_record JSONB;
  updated_count INTEGER := 0;
BEGIN
  -- Iterar sobre cada item no array JSON
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE public.itens_linha_oportunidade
    SET 
      datasul_dep_exp = NULLIF((item_record->>'datasul_dep_exp')::numeric, 0),
      datasul_custo = NULLIF((item_record->>'datasul_custo')::numeric, 0),
      datasul_divisao = NULLIF((item_record->>'datasul_divisao')::numeric, 0),
      datasul_vl_tot_item = NULLIF((item_record->>'datasul_vl_tot_item')::numeric, 0),
      datasul_vl_merc_liq = NULLIF((item_record->>'datasul_vl_merc_liq')::numeric, 0),
      datasul_lote_mulven = NULLIF((item_record->>'datasul_lote_mulven')::numeric, 0)
    WHERE oportunidade_id = p_oportunidade_id
      AND ordem_linha = (item_record->>'ordem_linha')::integer;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.batch_update_itens_oportunidade IS 'Atualiza em lote os campos Datasul dos itens de oportunidade';