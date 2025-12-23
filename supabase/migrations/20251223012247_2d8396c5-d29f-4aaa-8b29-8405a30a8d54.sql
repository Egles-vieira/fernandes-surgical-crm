
-- Remove todas as versões existentes da função
DROP FUNCTION IF EXISTS public.adicionar_item_carrinho(uuid, uuid, integer, text, text, numeric);
DROP FUNCTION IF EXISTS public.adicionar_item_carrinho(uuid, uuid, numeric, text, text, numeric);

-- Recria com tipo único (numeric para quantidade)
CREATE OR REPLACE FUNCTION public.adicionar_item_carrinho(
  p_conversa_id UUID,
  p_produto_id UUID,
  p_quantidade NUMERIC,
  p_produto_nome TEXT,
  p_produto_referencia TEXT,
  p_preco_unitario NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carrinho JSONB;
  v_item_existente JSONB;
  v_novo_carrinho JSONB;
  v_item_index INT;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Busca o carrinho atual
  SELECT COALESCE(produtos_carrinho, '[]'::jsonb)
  INTO v_carrinho
  FROM whatsapp_conversas
  WHERE id = p_conversa_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'Conversa não encontrada');
  END IF;
  
  -- Verifica se o produto já existe no carrinho
  v_novo_carrinho := '[]'::jsonb;
  FOR v_item_index IN 0..jsonb_array_length(v_carrinho) - 1 LOOP
    v_item_existente := v_carrinho->v_item_index;
    IF (v_item_existente->>'produto_id')::uuid = p_produto_id THEN
      -- Atualiza quantidade do item existente
      v_item_existente := jsonb_set(
        v_item_existente,
        '{quantidade}',
        to_jsonb((v_item_existente->>'quantidade')::numeric + p_quantidade)
      );
      v_found := TRUE;
    END IF;
    v_novo_carrinho := v_novo_carrinho || jsonb_build_array(v_item_existente);
  END LOOP;
  
  -- Se não encontrou, adiciona novo item
  IF NOT v_found THEN
    v_novo_carrinho := v_carrinho || jsonb_build_array(jsonb_build_object(
      'produto_id', p_produto_id,
      'produto_nome', p_produto_nome,
      'produto_referencia', p_produto_referencia,
      'quantidade', p_quantidade,
      'preco_unitario', p_preco_unitario,
      'adicionado_em', NOW()
    ));
  END IF;
  
  -- Atualiza o carrinho
  UPDATE whatsapp_conversas
  SET produtos_carrinho = v_novo_carrinho,
      updated_at = NOW()
  WHERE id = p_conversa_id;
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'carrinho', v_novo_carrinho,
    'total_itens', jsonb_array_length(v_novo_carrinho)
  );
END;
$$;
