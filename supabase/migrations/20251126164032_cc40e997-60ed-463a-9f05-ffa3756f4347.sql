-- Atualizar função para usar valores temporários e evitar conflitos de constraint
CREATE OR REPLACE FUNCTION atualizar_sequencia_itens_venda(
  p_updates JSONB
) RETURNS void AS $$
BEGIN
  -- Passo 1: Atualizar para valores temporários negativos (garantindo unicidade)
  -- Isso evita conflito com a constraint durante a transição
  UPDATE vendas_itens vi
  SET sequencia_item = -1 * (row_number() OVER (PARTITION BY vi.venda_id ORDER BY vi.id))::integer
  FROM jsonb_array_elements(p_updates) AS u
  WHERE vi.id = (u->>'id')::uuid;
  
  -- Passo 2: Atualizar para os valores finais desejados
  UPDATE vendas_itens vi
  SET sequencia_item = (u->>'sequencia_item')::integer
  FROM jsonb_array_elements(p_updates) AS u
  WHERE vi.id = (u->>'id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;