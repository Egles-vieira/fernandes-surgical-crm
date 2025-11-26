-- Função para atualizar sequência de itens de venda de forma atômica
-- Evita violação da constraint unique (venda_id, sequencia_item) durante reordenação
CREATE OR REPLACE FUNCTION atualizar_sequencia_itens_venda(
  p_updates JSONB
) RETURNS void AS $$
BEGIN
  -- Atualiza todos os itens em uma única operação atômica
  -- Isso evita estados intermediários onde dois itens teriam a mesma sequência
  UPDATE vendas_itens vi
  SET sequencia_item = (u->>'sequencia_item')::integer
  FROM jsonb_array_elements(p_updates) AS u
  WHERE vi.id = (u->>'id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;