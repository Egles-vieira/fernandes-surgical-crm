-- Corrigir RPC atualizar_itens_oportunidade_batch para calcular valor_desconto corretamente
-- O hook envia percentual_desconto, mas a coluna gerada preco_total usa valor_desconto
-- Fórmula: preco_total = (quantidade * preco_unitario) - valor_desconto + valor_imposto

CREATE OR REPLACE FUNCTION public.atualizar_itens_oportunidade_batch(
  p_oportunidade_id uuid,
  p_itens jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_item_id uuid;
  v_updated_at timestamptz;
  v_db_updated_at timestamptz;
  v_conflitos jsonb := '[]'::jsonb;
  v_atualizados int := 0;
  v_quantidade numeric;
  v_preco_unitario numeric;
  v_percentual_desconto numeric;
  v_valor_desconto numeric;
  v_db_quantidade numeric;
  v_db_preco_unitario numeric;
BEGIN
  -- Processar cada item do batch
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_item_id := (v_item->>'id')::uuid;
    v_updated_at := (v_item->>'updated_at')::timestamptz;
    
    -- Buscar dados atuais do item para optimistic locking e cálculo
    SELECT atualizado_em, quantidade, preco_unitario 
    INTO v_db_updated_at, v_db_quantidade, v_db_preco_unitario
    FROM public.itens_linha_oportunidade
    WHERE id = v_item_id;
    
    -- Se o registro foi modificado por outro usuário, registrar conflito
    IF v_db_updated_at IS NOT NULL AND v_updated_at IS NOT NULL 
       AND v_db_updated_at > v_updated_at THEN
      v_conflitos := v_conflitos || jsonb_build_object(
        'id', v_item_id,
        'reason', 'modified_by_another_user',
        'server_updated_at', v_db_updated_at
      );
      CONTINUE;
    END IF;
    
    -- Determinar valores finais (novo ou manter existente)
    v_quantidade := COALESCE((v_item->>'quantidade')::numeric, v_db_quantidade);
    v_preco_unitario := COALESCE((v_item->>'preco_unitario')::numeric, v_db_preco_unitario);
    v_percentual_desconto := COALESCE((v_item->>'percentual_desconto')::numeric, NULL);
    
    -- CRÍTICO: Calcular valor_desconto a partir do percentual
    -- Fórmula: valor_desconto = quantidade * preco_unitario * percentual_desconto / 100
    IF v_percentual_desconto IS NOT NULL THEN
      v_valor_desconto := v_quantidade * v_preco_unitario * v_percentual_desconto / 100;
    ELSE
      v_valor_desconto := NULL; -- Manter valor existente no banco
    END IF;
    
    -- Atualizar o item
    UPDATE public.itens_linha_oportunidade
    SET
      quantidade = v_quantidade,
      preco_unitario = v_preco_unitario,
      percentual_desconto = COALESCE(v_percentual_desconto, percentual_desconto),
      valor_desconto = COALESCE(v_valor_desconto, valor_desconto),
      produto_id = COALESCE((v_item->>'produto_id')::uuid, produto_id),
      nome_produto = COALESCE(v_item->>'nome_produto', nome_produto),
      atualizado_em = now()
    WHERE id = v_item_id
      AND oportunidade_id = p_oportunidade_id;
    
    IF FOUND THEN
      v_atualizados := v_atualizados + 1;
    END IF;
  END LOOP;
  
  -- ============================================
  -- RECÁLCULO SÍNCRONO DO VALOR DA OPORTUNIDADE
  -- ============================================
  UPDATE public.oportunidades 
  SET 
    valor = (
      SELECT COALESCE(SUM(preco_total), 0)
      FROM public.itens_linha_oportunidade
      WHERE oportunidade_id = p_oportunidade_id
    ),
    atualizado_em = now()
  WHERE id = p_oportunidade_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'atualizados', v_atualizados,
    'conflitos', v_conflitos
  );
END;
$$;

-- Corrigir batch_update_itens_oportunidade para usar integer no lote_mulven
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
      datasul_lote_mulven = NULLIF((item_record->>'datasul_lote_mulven')::integer, 0)
    WHERE oportunidade_id = p_oportunidade_id
      AND ordem_linha = (item_record->>'ordem_linha')::integer;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$;