-- RPC para inserir itens em lote na oportunidade
CREATE OR REPLACE FUNCTION inserir_itens_oportunidade_bulk(
  p_oportunidade_id UUID,
  p_itens JSONB
) RETURNS void AS $$
DECLARE
  item JSONB;
  seq INT;
BEGIN
  -- Obter próxima sequência
  SELECT COALESCE(MAX(ordem_linha), 0) INTO seq
  FROM itens_linha_oportunidade WHERE oportunidade_id = p_oportunidade_id;
  
  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    seq := seq + 1;
    INSERT INTO itens_linha_oportunidade (
      oportunidade_id, 
      produto_id, 
      nome_produto,
      quantidade, 
      preco_unitario,
      percentual_desconto, 
      preco_total, 
      ordem_linha
    ) VALUES (
      p_oportunidade_id,
      (item->>'produto_id')::UUID,
      (item->>'nome_produto')::TEXT,
      (item->>'quantidade')::NUMERIC,
      (item->>'preco_unitario')::NUMERIC,
      COALESCE((item->>'percentual_desconto')::NUMERIC, 0),
      (item->>'quantidade')::NUMERIC * (item->>'preco_unitario')::NUMERIC * (1 - COALESCE((item->>'percentual_desconto')::NUMERIC, 0) / 100),
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