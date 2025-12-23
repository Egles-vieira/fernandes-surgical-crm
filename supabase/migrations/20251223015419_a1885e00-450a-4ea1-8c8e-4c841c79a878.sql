-- Corrige a função adicionar_item_carrinho para usar o nome correto da coluna (atualizado_em)
DROP FUNCTION IF EXISTS public.adicionar_item_carrinho(UUID, UUID, NUMERIC, TEXT, TEXT, NUMERIC);

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
  -- Lock para evitar race condition
  PERFORM pg_advisory_xact_lock(hashtext(p_conversa_id::text));

  -- Busca o carrinho atual com lock de linha
  SELECT COALESCE(produtos_carrinho, '[]'::jsonb)
  INTO v_carrinho
  FROM whatsapp_conversas
  WHERE id = p_conversa_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'Conversa não encontrada');
  END IF;
  
  -- Verifica se o produto já existe no carrinho
  v_novo_carrinho := '[]'::jsonb;
  FOR v_item_index IN 0..jsonb_array_length(v_carrinho) - 1 LOOP
    v_item_existente := v_carrinho->v_item_index;
    IF (v_item_existente->>'produto_id')::uuid = p_produto_id OR (v_item_existente->>'id')::uuid = p_produto_id THEN
      -- Atualiza quantidade do item existente (soma)
      v_item_existente := jsonb_set(
        v_item_existente,
        '{quantidade}',
        to_jsonb((COALESCE(v_item_existente->>'quantidade', '0'))::numeric + p_quantidade)
      );
      v_found := TRUE;
    END IF;
    v_novo_carrinho := v_novo_carrinho || jsonb_build_array(v_item_existente);
  END LOOP;
  
  -- Se não encontrou, adiciona novo item
  IF NOT v_found THEN
    v_novo_carrinho := v_carrinho || jsonb_build_array(jsonb_build_object(
      'id', p_produto_id,
      'produto_id', p_produto_id,
      'produto_nome', p_produto_nome,
      'nome', p_produto_nome,
      'produto_referencia', p_produto_referencia,
      'referencia', p_produto_referencia,
      'quantidade', p_quantidade,
      'preco_unitario', p_preco_unitario,
      'adicionado_em', NOW()
    ));
  END IF;
  
  -- Atualiza o carrinho na conversa (usando atualizado_em, não updated_at)
  UPDATE whatsapp_conversas
  SET produtos_carrinho = v_novo_carrinho,
      atualizado_em = NOW()
  WHERE id = p_conversa_id;
  
  -- Sincroniza com sessão ativa se existir
  UPDATE whatsapp_agente_sessoes
  SET carrinho_itens = v_novo_carrinho,
      atualizado_em = NOW()
  WHERE conversa_id = p_conversa_id
    AND expira_em > NOW();
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'carrinho', v_novo_carrinho,
    'carrinho_atual', v_novo_carrinho,
    'total_itens', jsonb_array_length(v_novo_carrinho),
    'carrinho_total_itens', jsonb_array_length(v_novo_carrinho)
  );
END;
$$;