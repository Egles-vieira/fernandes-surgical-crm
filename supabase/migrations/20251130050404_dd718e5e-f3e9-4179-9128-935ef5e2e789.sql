-- RPC para inserir itens em lote na venda
CREATE OR REPLACE FUNCTION inserir_itens_venda_bulk(
  p_venda_id UUID,
  p_itens JSONB
) RETURNS void AS $$
DECLARE
  item JSONB;
  seq INT;
BEGIN
  -- Obter próxima sequência
  SELECT COALESCE(MAX(sequencia_item), 0) INTO seq
  FROM vendas_itens WHERE venda_id = p_venda_id;
  
  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    seq := seq + 1;
    INSERT INTO vendas_itens (
      venda_id, 
      produto_id, 
      quantidade, 
      preco_unitario,
      preco_tabela, 
      desconto, 
      valor_total, 
      sequencia_item
    ) VALUES (
      p_venda_id,
      (item->>'produto_id')::UUID,
      (item->>'quantidade')::NUMERIC,
      (item->>'preco_unitario')::NUMERIC,
      (item->>'preco_unitario')::NUMERIC,
      COALESCE((item->>'desconto')::NUMERIC, 0),
      (item->>'quantidade')::NUMERIC * (item->>'preco_unitario')::NUMERIC * (1 - COALESCE((item->>'desconto')::NUMERIC, 0) / 100),
      seq
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;