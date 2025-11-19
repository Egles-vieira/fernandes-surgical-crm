-- Adicionar campos para armazenar informações do retorno do cálculo Datasul
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS datasul_errornumber INTEGER,
ADD COLUMN IF NOT EXISTS datasul_errordescription TEXT,
ADD COLUMN IF NOT EXISTS datasul_msg_credito TEXT,
ADD COLUMN IF NOT EXISTS datasul_ind_cre_cli TEXT,
ADD COLUMN IF NOT EXISTS datasul_limite_disponivel NUMERIC(15,2);

-- Adicionar comentários para documentação
COMMENT ON COLUMN vendas.datasul_errornumber IS 'Código numérico de erro do cálculo Datasul (0 = sem erro)';
COMMENT ON COLUMN vendas.datasul_errordescription IS 'Descrição textual do erro do cálculo Datasul';
COMMENT ON COLUMN vendas.datasul_msg_credito IS 'Mensagem relacionada ao crédito do cliente';
COMMENT ON COLUMN vendas.datasul_ind_cre_cli IS 'Indicador de crédito do cliente (Normal, bloqueado, risco etc)';
COMMENT ON COLUMN vendas.datasul_limite_disponivel IS 'Limite de crédito disponível após o cálculo';