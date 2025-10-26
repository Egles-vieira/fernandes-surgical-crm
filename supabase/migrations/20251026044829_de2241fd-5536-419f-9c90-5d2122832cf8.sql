-- Habilitar realtime para a tabela edi_cotacoes
ALTER TABLE public.edi_cotacoes REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.edi_cotacoes;

-- Habilitar realtime para a tabela edi_cotacoes_itens também
ALTER TABLE public.edi_cotacoes_itens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.edi_cotacoes_itens;