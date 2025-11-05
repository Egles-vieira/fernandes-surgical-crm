-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS update_solicitacoes_cadastro_updated_at ON solicitacoes_cadastro;

-- Criar função de atualização de timestamp (se não existir)
CREATE OR REPLACE FUNCTION update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger correto para atualizar atualizado_em
CREATE TRIGGER update_solicitacoes_cadastro_atualizado_em
    BEFORE UPDATE ON solicitacoes_cadastro
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em_column();