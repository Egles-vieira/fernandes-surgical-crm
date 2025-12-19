-- Corrigir RPC para não inserir em preco_total (coluna gerada)
CREATE OR REPLACE FUNCTION inserir_itens_oportunidade_bulk(
  p_oportunidade_id UUID,
  p_itens JSONB
) RETURNS void AS $$
DECLARE
  item JSONB;
  seq INT;
  v_quantidade NUMERIC;
  v_preco_unitario NUMERIC;
  v_percentual_desconto NUMERIC;
  v_valor_desconto NUMERIC;
BEGIN
  -- Obter próxima sequência
  SELECT COALESCE(MAX(ordem_linha), 0) INTO seq
  FROM itens_linha_oportunidade WHERE oportunidade_id = p_oportunidade_id;
  
  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    seq := seq + 1;
    v_quantidade := (item->>'quantidade')::NUMERIC;
    v_preco_unitario := (item->>'preco_unitario')::NUMERIC;
    v_percentual_desconto := COALESCE((item->>'percentual_desconto')::NUMERIC, 0);
    v_valor_desconto := (v_quantidade * v_preco_unitario * v_percentual_desconto / 100);
    
    INSERT INTO itens_linha_oportunidade (
      oportunidade_id, 
      produto_id, 
      nome_produto,
      quantidade, 
      preco_unitario,
      percentual_desconto,
      valor_desconto,
      valor_imposto,
      ordem_linha
    ) VALUES (
      p_oportunidade_id,
      (item->>'produto_id')::UUID,
      (item->>'nome_produto')::TEXT,
      v_quantidade,
      v_preco_unitario,
      v_percentual_desconto,
      v_valor_desconto,
      0,
      seq
    );
  END LOOP;
  
  -- Atualizar valor total da oportunidade
  UPDATE oportunidades 
  SET valor = (
    SELECT COALESCE(SUM(preco_total), 0) 
    FROM itens_linha_oportunidade 
    WHERE oportunidade_id = p_oportunidade_id
  )
  WHERE id = p_oportunidade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;