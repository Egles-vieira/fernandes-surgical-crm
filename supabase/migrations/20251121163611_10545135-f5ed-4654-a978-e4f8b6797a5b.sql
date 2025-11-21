-- Adicionar campos de métricas de tempo na tabela de logs
ALTER TABLE integracoes_totvs_calcula_pedido 
ADD COLUMN IF NOT EXISTS tempo_preparacao_dados_ms INTEGER,
ADD COLUMN IF NOT EXISTS tempo_api_ms INTEGER,
ADD COLUMN IF NOT EXISTS tempo_tratamento_dados_ms INTEGER;

COMMENT ON COLUMN integracoes_totvs_calcula_pedido.tempo_preparacao_dados_ms IS 'Tempo gasto na preparação dos dados antes de chamar a API Datasul';
COMMENT ON COLUMN integracoes_totvs_calcula_pedido.tempo_api_ms IS 'Tempo de resposta da API Datasul';
COMMENT ON COLUMN integracoes_totvs_calcula_pedido.tempo_tratamento_dados_ms IS 'Tempo gasto no tratamento dos dados após retorno da API';