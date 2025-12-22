
-- Função atômica para adicionar/atualizar item no carrinho
-- Evita race condition quando múltiplas tool calls rodam em paralelo
CREATE OR REPLACE FUNCTION public.adicionar_item_carrinho(
  p_conversa_id UUID,
  p_produto_id UUID,
  p_quantidade NUMERIC,
  p_produto_nome TEXT DEFAULT NULL,
  p_produto_referencia TEXT DEFAULT NULL,
  p_preco_unitario NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carrinho JSONB;
  v_novo_item JSONB;
  v_item_existente JSONB;
  v_index INT;
  v_resultado JSONB;
BEGIN
  -- Bloquear a linha para evitar race condition
  SELECT produtos_carrinho 
  INTO v_carrinho
  FROM whatsapp_conversas 
  WHERE id = p_conversa_id
  FOR UPDATE;
  
  -- Se não existe ou é null, inicializar como array vazio
  IF v_carrinho IS NULL THEN
    v_carrinho := '[]'::JSONB;
  END IF;
  
  -- Criar o novo item
  v_novo_item := jsonb_build_object(
    'id', p_produto_id,
    'quantidade', p_quantidade,
    'nome', COALESCE(p_produto_nome, ''),
    'referencia', COALESCE(p_produto_referencia, ''),
    'preco_unitario', p_preco_unitario
  );
  
  -- Procurar se o item já existe no carrinho
  v_index := -1;
  FOR i IN 0..jsonb_array_length(v_carrinho) - 1 LOOP
    IF (v_carrinho->i->>'id')::UUID = p_produto_id THEN
      v_index := i;
      EXIT;
    END IF;
  END LOOP;
  
  -- Se encontrou, atualizar quantidade; senão, adicionar
  IF v_index >= 0 THEN
    v_carrinho := jsonb_set(v_carrinho, ARRAY[v_index::TEXT], v_novo_item);
  ELSE
    v_carrinho := v_carrinho || jsonb_build_array(v_novo_item);
  END IF;
  
  -- Salvar de volta
  UPDATE whatsapp_conversas 
  SET produtos_carrinho = v_carrinho
  WHERE id = p_conversa_id;
  
  -- Retornar resultado
  v_resultado := jsonb_build_object(
    'sucesso', true,
    'carrinho_total_itens', jsonb_array_length(v_carrinho),
    'carrinho', v_carrinho
  );
  
  RETURN v_resultado;
END;
$$;

-- Conceder permissão para a função ser chamada via RPC
GRANT EXECUTE ON FUNCTION public.adicionar_item_carrinho TO authenticated, anon, service_role;
