-- ============================================
-- Modificar RPC para recálculo SÍNCRONO
-- Remove dependência do cron job
-- ============================================

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
BEGIN
  -- Processar cada item do batch
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_item_id := (v_item->>'id')::uuid;
    v_updated_at := (v_item->>'updated_at')::timestamptz;
    
    -- Verificar timestamp para optimistic locking
    SELECT atualizado_em INTO v_db_updated_at
    FROM public.itens_linha_oportunidade
    WHERE id = v_item_id;
    
    -- Se o registro foi modificado por outro usuário, registrar conflito
    IF v_db_updated_at IS NOT NULL AND v_updated_at IS NOT NULL 
       AND v_db_updated_at > v_updated_at THEN
      v_conflitos := v_conflitos || jsonb_build_object(
        'id', v_item_id,
        'campo', 'updated_at',
        'valor_atual', v_db_updated_at,
        'valor_enviado', v_updated_at
      );
      CONTINUE;
    END IF;
    
    -- Atualizar o item
    UPDATE public.itens_linha_oportunidade
    SET
      quantidade = COALESCE((v_item->>'quantidade')::numeric, quantidade),
      preco_unitario = COALESCE((v_item->>'preco_unitario')::numeric, preco_unitario),
      valor_desconto = COALESCE((v_item->>'valor_desconto')::numeric, valor_desconto),
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
  -- Substitui o job assíncrono
  -- ============================================
  UPDATE public.oportunidades 
  SET 
    valor = (
      SELECT COALESCE(SUM(
        (quantidade * preco_unitario) - COALESCE(valor_desconto, 0)
      ), 0)
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

-- ============================================
-- Limpar jobs pendentes acumulados
-- ============================================
DELETE FROM public.jobs_recalculo_oportunidade WHERE status = 'pending';

-- Comentário para documentação
COMMENT ON FUNCTION public.atualizar_itens_oportunidade_batch IS 
'Atualiza itens de oportunidade em batch com optimistic locking. 
Recalcula o valor total da oportunidade de forma SÍNCRONA (não usa mais fila de jobs).';