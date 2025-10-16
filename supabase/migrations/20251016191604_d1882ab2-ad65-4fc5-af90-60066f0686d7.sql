-- =====================================================
-- CORRIGIR PROBLEMAS DE SEGURANÇA - RLS NAS TABELAS FALTANTES
-- =====================================================

-- Perfis (sistema)
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar perfis"
    ON perfis FOR SELECT
    USING (excluido_em IS NULL);

CREATE POLICY "Admins podem gerenciar perfis"
    ON perfis FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Permissões
ALTER TABLE permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar permissões"
    ON permissoes FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar permissões"
    ON permissoes FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Perfis-Permissões
ALTER TABLE perfis_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar relacionamentos"
    ON perfis_permissoes FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar relacionamentos"
    ON perfis_permissoes FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Equipes
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar equipes ativas"
    ON equipes FOR SELECT
    USING (esta_ativa = true AND excluido_em IS NULL);

CREATE POLICY "Líderes e admins podem gerenciar equipes"
    ON equipes FOR ALL
    USING (lider_equipe_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Membros de equipe
ALTER TABLE membros_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar membros da equipe"
    ON membros_equipe FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Líderes podem gerenciar membros"
    ON membros_equipe FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM equipes 
            WHERE equipes.id = membros_equipe.equipe_id 
            AND (equipes.lider_equipe_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
        )
    );

-- Perfis sociais
ALTER TABLE perfis_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar perfis sociais"
    ON perfis_sociais FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem gerenciar perfis sociais"
    ON perfis_sociais FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

-- Etiquetaveis
ALTER TABLE etiquetaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar etiquetas"
    ON etiquetaveis FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem gerenciar etiquetas"
    ON etiquetaveis FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Histórico de estágio de oportunidade
ALTER TABLE historico_estagio_oportunidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar histórico"
    ON historico_estagio_oportunidade FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM oportunidades 
            WHERE oportunidades.id = historico_estagio_oportunidade.oportunidade_id 
            AND (oportunidades.proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
        )
    );

CREATE POLICY "Sistema pode inserir histórico"
    ON historico_estagio_oportunidade FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Itens de linha de oportunidade
ALTER TABLE itens_linha_oportunidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar itens"
    ON itens_linha_oportunidade FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM oportunidades 
            WHERE oportunidades.id = itens_linha_oportunidade.oportunidade_id 
            AND (oportunidades.proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]))
        )
    );

CREATE POLICY "Usuários podem gerenciar itens"
    ON itens_linha_oportunidade FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM oportunidades 
            WHERE oportunidades.id = itens_linha_oportunidade.oportunidade_id 
            AND (oportunidades.proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
        )
    );

-- Cotações
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar cotações"
    ON cotacoes FOR SELECT
    USING (excluido_em IS NULL AND (proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])));

CREATE POLICY "Sales podem criar cotações"
    ON cotacoes FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Proprietários podem atualizar cotações"
    ON cotacoes FOR UPDATE
    USING (proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins podem deletar cotações"
    ON cotacoes FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Itens de linha de cotação
ALTER TABLE itens_linha_cotacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar itens de cotação"
    ON itens_linha_cotacao FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cotacoes 
            WHERE cotacoes.id = itens_linha_cotacao.cotacao_id 
            AND (cotacoes.proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
        )
    );

CREATE POLICY "Usuários podem gerenciar itens de cotação"
    ON itens_linha_cotacao FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cotacoes 
            WHERE cotacoes.id = itens_linha_cotacao.cotacao_id 
            AND (cotacoes.proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
        )
    );

-- Corrigir função atualizar_updated_at com search_path (usando CASCADE)
DROP FUNCTION IF EXISTS atualizar_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- Recriar todos os triggers
CREATE TRIGGER trigger_empresas_updated_at BEFORE UPDATE ON empresas
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_perfis_updated_at BEFORE UPDATE ON perfis
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_perfis_usuario_updated_at BEFORE UPDATE ON perfis_usuario
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_equipes_updated_at BEFORE UPDATE ON equipes
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_enderecos_updated_at BEFORE UPDATE ON enderecos
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_contas_updated_at BEFORE UPDATE ON contas
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_contatos_updated_at BEFORE UPDATE ON contatos
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_perfis_sociais_updated_at BEFORE UPDATE ON perfis_sociais
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_pipelines_updated_at BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_estagios_pipeline_updated_at BEFORE UPDATE ON estagios_pipeline
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_oportunidades_updated_at BEFORE UPDATE ON oportunidades
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_produtos_catalogo_updated_at BEFORE UPDATE ON produtos_catalogo
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_itens_linha_oportunidade_updated_at BEFORE UPDATE ON itens_linha_oportunidade
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_cotacoes_updated_at BEFORE UPDATE ON cotacoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();