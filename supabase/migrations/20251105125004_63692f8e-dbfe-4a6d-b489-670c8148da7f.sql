-- Remover TODOS os triggers que tentam usar updated_at na tabela solicitacoes_cadastro
DROP TRIGGER IF EXISTS update_solicitacoes_cadastro_updated_at ON solicitacoes_cadastro;
DROP TRIGGER IF EXISTS set_updated_at ON solicitacoes_cadastro;
DROP TRIGGER IF EXISTS update_updated_at ON solicitacoes_cadastro;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS update_solicitacoes_cadastro_atualizado_em ON solicitacoes_cadastro;

-- Garantir que a função existe
CREATE OR REPLACE FUNCTION update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger correto
CREATE TRIGGER update_solicitacoes_cadastro_atualizado_em
    BEFORE UPDATE ON solicitacoes_cadastro
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em_column();