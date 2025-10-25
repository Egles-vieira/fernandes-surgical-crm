-- Função para buscar itens pendentes de cotações EDI com dados enriquecidos
CREATE OR REPLACE FUNCTION public.get_pending_items()
RETURNS TABLE (
  item_id UUID,
  cotacao_id UUID,
  cnpj_cliente TEXT,
  plataforma_id UUID,
  descricao_produto_cliente TEXT,
  quantidade NUMERIC,
  unidade_medida TEXT,
  codigo_produto_cliente TEXT
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
    ec.cnpj_cliente,
    ec.plataforma_id,
    eci.descricao_produto_cliente,
    eci.quantidade,
    eci.unidade_medida,
    eci.codigo_produto_cliente
  FROM public.edi_cotacoes_itens eci
  INNER JOIN public.edi_cotacoes ec ON ec.id = eci.cotacao_id
  WHERE eci.produto_sugerido_id IS NULL
    AND eci.sugestao_ia_gerada = false
  LIMIT 50;
END;
$$;