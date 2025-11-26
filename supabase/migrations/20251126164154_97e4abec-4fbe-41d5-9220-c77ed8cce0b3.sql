-- Corrigir função sem usar window functions no UPDATE
CREATE OR REPLACE FUNCTION atualizar_sequencia_itens_venda(
  p_updates JSONB
) RETURNS void AS $$
DECLARE
  v_item JSONB;
BEGIN
  -- Passo 1: Mover todos os itens para valores temporários muito altos
  -- Isso garante que não haverá conflito de constraint durante a transição
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE vendas_itens
    SET sequencia_item = 10000 + (v_item->>'sequencia_item')::integer
    WHERE id = (v_item->>'id')::uuid;
  END LOOP;
  
  -- Passo 2: Atualizar para os valores finais desejados
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE vendas_itens
    SET sequencia_item = (v_item->>'sequencia_item')::integer
    WHERE id = (v_item->>'id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;