-- Adicionar campos para armazenar última integração Datasul na tabela vendas
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS ultima_integracao_datasul_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ultima_integracao_datasul_requisicao JSONB,
ADD COLUMN IF NOT EXISTS ultima_integracao_datasul_resposta JSONB,
ADD COLUMN IF NOT EXISTS ultima_integracao_datasul_status TEXT;