-- RPC para atualizar múltiplos itens de oportunidade em batch (evita N requisições)
CREATE OR REPLACE FUNCTION public.atualizar_itens_oportunidade_batch(
  p_oportunidade_id UUID,
  p_itens JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_item_id UUID;
  v_updated_at TIMESTAMPTZ;
  v_current_updated_at TIMESTAMPTZ;
  v_conflitos JSONB := '[]'::JSONB;
  v_atualizados INT := 0;
BEGIN
  -- p_itens deve ser array: [{"id": "uuid", "dados": {...}, "updated_at": "timestamp"}, ...]
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_item_id := (v_item->>'id')::UUID;
    v_updated_at := (v_item->>'updated_at')::TIMESTAMPTZ;
    
    -- Verificar optimistic locking se updated_at foi fornecido
    IF v_updated_at IS NOT NULL THEN
      SELECT atualizado_em INTO v_current_updated_at
      FROM itens_linha_oportunidade
      WHERE id = v_item_id;
      
      -- Se o registro foi modificado por outro usuário, registrar conflito
      IF v_current_updated_at IS NOT NULL AND v_current_updated_at > v_updated_at THEN
        v_conflitos := v_conflitos || jsonb_build_object(
          'id', v_item_id,
          'reason', 'CONFLICT',
          'server_updated_at', v_current_updated_at
        );
        CONTINUE;
      END IF;
    END IF;
    
    -- Atualizar o item
    UPDATE itens_linha_oportunidade
    SET
      quantidade = COALESCE((v_item->'dados'->>'quantidade')::NUMERIC, quantidade),
      percentual_desconto = COALESCE((v_item->'dados'->>'percentual_desconto')::NUMERIC, percentual_desconto),
      preco_unitario = COALESCE((v_item->'dados'->>'preco_unitario')::NUMERIC, preco_unitario),
      atualizado_em = NOW()
    WHERE id = v_item_id
      AND oportunidade_id = p_oportunidade_id;
    
    IF FOUND THEN
      v_atualizados := v_atualizados + 1;
    END IF;
  END LOOP;
  
  -- Recalcular valor total da oportunidade
  UPDATE oportunidades o
  SET valor = (
    SELECT COALESCE(SUM(preco_total), 0)
    FROM itens_linha_oportunidade
    WHERE oportunidade_id = p_oportunidade_id
  )
  WHERE o.id = p_oportunidade_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'atualizados', v_atualizados,
    'conflitos', v_conflitos
  );
END;
$$;

-- Adicionar coluna atualizado_em se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'itens_linha_oportunidade' 
    AND column_name = 'atualizado_em'
  ) THEN
    ALTER TABLE public.itens_linha_oportunidade
    ADD COLUMN atualizado_em TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION public.update_item_oportunidade_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_item_oportunidade_timestamp ON public.itens_linha_oportunidade;

CREATE TRIGGER trigger_update_item_oportunidade_timestamp
BEFORE UPDATE ON public.itens_linha_oportunidade
FOR EACH ROW
EXECUTE FUNCTION public.update_item_oportunidade_timestamp();