-- Reverter migração: remover coluna contato_responsavel_id e restaurar trigger original

-- 1. Remover o índice criado
DROP INDEX IF EXISTS idx_vendas_contato_responsavel;

-- 2. Remover a coluna contato_responsavel_id
ALTER TABLE public.vendas DROP COLUMN IF EXISTS contato_responsavel_id;

-- 3. Restaurar o trigger original (caso tenha sido modificado)
-- O trigger set_responsavel_venda original deve continuar funcionando normalmente
-- pois ele apenas define responsavel_id = auth.uid() quando NULL