-- =====================================================
-- ÍNDICES COMPOSTOS PARA TABELA VENDAS
-- Objetivo: Aumentar idx_ratio de 25% para >80%
-- =====================================================

-- Índice para filtros de pipeline (Kanban)
CREATE INDEX IF NOT EXISTS idx_vendas_pipeline_status 
ON vendas(etapa_pipeline, status);

-- Índice para filtros por vendedor/responsável
CREATE INDEX IF NOT EXISTS idx_vendas_responsavel_data 
ON vendas(responsavel_id, created_at DESC);

-- Índice para filtros por cliente
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_data 
ON vendas(cliente_id, created_at DESC);

-- Índice para filtros por período (relatórios)
CREATE INDEX IF NOT EXISTS idx_vendas_aprovado_em 
ON vendas(aprovado_em DESC) 
WHERE aprovado_em IS NOT NULL;

-- Índice para buscas por data de criação
CREATE INDEX IF NOT EXISTS idx_vendas_created_at 
ON vendas(created_at DESC);

-- Índice para filtros combinados do Kanban
CREATE INDEX IF NOT EXISTS idx_vendas_etapa_created 
ON vendas(etapa_pipeline, created_at DESC);

-- Atualizar estatísticas
ANALYZE vendas;