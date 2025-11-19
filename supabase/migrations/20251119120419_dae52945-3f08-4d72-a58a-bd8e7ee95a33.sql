-- Alterar tipo dos campos de JSONB para TEXT para preservar ordem dos campos JSON

-- Tabela integracoes_totvs_calcula_pedido
ALTER TABLE public.integracoes_totvs_calcula_pedido 
  ALTER COLUMN request_payload TYPE TEXT USING request_payload::TEXT,
  ALTER COLUMN response_payload TYPE TEXT USING response_payload::TEXT;

-- Tabela vendas
ALTER TABLE public.vendas 
  ALTER COLUMN ultima_integracao_datasul_requisicao TYPE TEXT USING ultima_integracao_datasul_requisicao::TEXT,
  ALTER COLUMN ultima_integracao_datasul_resposta TYPE TEXT USING ultima_integracao_datasul_resposta::TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.integracoes_totvs_calcula_pedido.request_payload IS 'Payload enviado ao Datasul (TEXT para preservar ordem dos campos)';
COMMENT ON COLUMN public.integracoes_totvs_calcula_pedido.response_payload IS 'Resposta do Datasul (TEXT para preservar ordem dos campos)';
COMMENT ON COLUMN public.vendas.ultima_integracao_datasul_requisicao IS 'Última requisição enviada ao Datasul (TEXT para preservar ordem dos campos)';
COMMENT ON COLUMN public.vendas.ultima_integracao_datasul_resposta IS 'Última resposta do Datasul (TEXT para preservar ordem dos campos)';