-- Drop e recriar função RPC para buscar itens pendentes
DROP FUNCTION IF EXISTS get_pending_items();

CREATE OR REPLACE FUNCTION get_pending_items()
RETURNS TABLE (
  item_id uuid,
  cotacao_id uuid,
  plataforma_id uuid,
  cnpj_cliente varchar,
  descricao_produto_cliente text,
  codigo_produto_cliente varchar,
  quantidade_solicitada numeric,
  unidade_medida varchar,
  numero_item integer,
  id_item_externo varchar
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eci.id as item_id,
    eci.cotacao_id,
    ec.plataforma_id,
    ec.cnpj_cliente,
    eci.descricao_produto_cliente,
    eci.codigo_produto_cliente,
    eci.quantidade_solicitada,
    eci.unidade_medida,
    eci.numero_item,
    eci.id_item_externo
  FROM edi_cotacoes_itens eci
  INNER JOIN edi_cotacoes ec ON ec.id = eci.cotacao_id
  WHERE eci.produto_id IS NULL
    AND eci.status = 'pendente'
    AND ec.resgatada = true
  ORDER BY ec.data_vencimento_atual ASC, eci.numero_item ASC;
END;
$$;