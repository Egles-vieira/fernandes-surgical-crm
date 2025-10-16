-- =====================================================
-- ESTRUTURA CRM - CORE + VENDAS + CONTATOS
-- Integrado com Supabase Auth
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- MÓDULO CORE
-- =====================================================

-- Empresas (suporte para multi-empresa)
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    setor VARCHAR(100),
    tamanho_empresa VARCHAR(50),
    site VARCHAR(255),
    url_logo VARCHAR(500),
    cor_primaria VARCHAR(7),
    cor_secundaria VARCHAR(7),
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL
);

-- Perfis do sistema (extensão do sistema de roles existente)
CREATE TABLE perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    eh_perfil_sistema BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL
);

-- Permissões detalhadas
CREATE TABLE permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo VARCHAR(100) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT,
    UNIQUE(modulo, acao)
);

-- Relacionamento perfis-permissões
CREATE TABLE perfis_permissoes (
    perfil_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    permissao_id UUID REFERENCES permissoes(id) ON DELETE CASCADE,
    PRIMARY KEY (perfil_id, permissao_id)
);

-- Perfil de usuário (extensão do auth.users)
CREATE TABLE perfis_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id),
    primeiro_nome VARCHAR(100),
    sobrenome VARCHAR(100),
    nome_completo VARCHAR(255) GENERATED ALWAYS AS (COALESCE(primeiro_nome, '') || ' ' || COALESCE(sobrenome, '')) STORED,
    url_avatar VARCHAR(500),
    telefone VARCHAR(50),
    celular VARCHAR(50),
    cargo VARCHAR(150),
    departamento VARCHAR(100),
    perfil_id UUID REFERENCES perfis(id),
    gerente_id UUID REFERENCES auth.users(id),
    fuso_horario VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    idioma VARCHAR(10) DEFAULT 'pt-BR',
    esta_ativo BOOLEAN DEFAULT true,
    ultimo_login_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipes
CREATE TABLE equipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    lider_equipe_id UUID REFERENCES auth.users(id),
    tipo_equipe VARCHAR(50), -- vendas, marketing, suporte
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL
);

-- Membros da equipe
CREATE TABLE membros_equipe (
    equipe_id UUID REFERENCES equipes(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entrou_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (equipe_id, usuario_id)
);

-- =====================================================
-- MÓDULO CONTATOS
-- =====================================================

-- Endereços (tabela compartilhada)
CREATE TABLE enderecos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(50),
    pais VARCHAR(100) DEFAULT 'Brasil',
    cep VARCHAR(10),
    tipo_endereco VARCHAR(50), -- cobranca, entrega, correspondencia
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    eh_primario BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contas (empresas clientes)
CREATE TABLE contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_conta VARCHAR(255) NOT NULL,
    tipo_conta VARCHAR(50), -- prospecto, cliente, parceiro, concorrente
    setor VARCHAR(100),
    receita_anual DECIMAL(15,2),
    numero_funcionarios INTEGER,
    site VARCHAR(255),
    cnpj VARCHAR(18),
    conta_pai_id UUID REFERENCES contas(id),
    proprietario_id UUID REFERENCES auth.users(id),
    classificacao VARCHAR(20), -- quente, morno, frio
    estagio_ciclo_vida VARCHAR(50),
    origem_lead VARCHAR(100),
    descricao TEXT,
    endereco_cobranca_id UUID REFERENCES enderecos(id),
    endereco_entrega_id UUID REFERENCES enderecos(id),
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_contas_busca ON contas 
    USING gin(to_tsvector('portuguese', nome_conta || ' ' || COALESCE(descricao, '')));
CREATE INDEX idx_contas_proprietario ON contas(proprietario_id) WHERE excluido_em IS NULL;

-- Contatos
CREATE TABLE contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id UUID REFERENCES contas(id),
    primeiro_nome VARCHAR(100) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL,
    nome_completo VARCHAR(255) GENERATED ALWAYS AS (primeiro_nome || ' ' || sobrenome) STORED,
    email VARCHAR(255),
    email_secundario VARCHAR(255),
    telefone VARCHAR(50),
    celular VARCHAR(50),
    cargo VARCHAR(150),
    departamento VARCHAR(100),
    data_nascimento DATE,
    origem_lead VARCHAR(100),
    status_lead VARCHAR(50), -- novo, contatado, qualificado, perdido
    pontuacao_lead INTEGER DEFAULT 0,
    estagio_ciclo_vida VARCHAR(50), -- lead, mql, sql, oportunidade, cliente
    proprietario_id UUID REFERENCES auth.users(id),
    reporta_para_id UUID REFERENCES contatos(id),
    descricao TEXT,
    nao_ligar BOOLEAN DEFAULT false,
    nao_enviar_email BOOLEAN DEFAULT false,
    cancelou_inscricao_email BOOLEAN DEFAULT false,
    endereco_correspondencia_id UUID REFERENCES enderecos(id),
    esta_ativo BOOLEAN DEFAULT true,
    data_ultima_atividade TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_contatos_email ON contatos(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contatos_conta ON contatos(conta_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_contatos_proprietario ON contatos(proprietario_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_contatos_busca ON contatos 
    USING gin(to_tsvector('portuguese', nome_completo || ' ' || COALESCE(email, '') || ' ' || COALESCE(cargo, '')));

-- Perfis sociais
CREATE TABLE perfis_sociais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contato_id UUID REFERENCES contatos(id) ON DELETE CASCADE,
    conta_id UUID REFERENCES contas(id) ON DELETE CASCADE,
    plataforma VARCHAR(50) NOT NULL, -- linkedin, facebook, twitter, instagram
    url_perfil VARCHAR(500),
    nome_usuario VARCHAR(150),
    numero_seguidores INTEGER,
    ultima_sincronizacao_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT chk_perfis_sociais_entidade CHECK (
        (contato_id IS NOT NULL AND conta_id IS NULL) OR 
        (contato_id IS NULL AND conta_id IS NOT NULL)
    )
);

-- Tags
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    cor VARCHAR(7),
    categoria VARCHAR(50), -- lead, contato, conta, oportunidade
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Relacionamento polimórfico de tags
CREATE TABLE etiquetaveis (
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    tipo_etiquetavel VARCHAR(50) NOT NULL, -- contatos, contas, oportunidades
    id_etiquetavel UUID NOT NULL,
    etiquetado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (tag_id, tipo_etiquetavel, id_etiquetavel)
);

CREATE INDEX idx_etiquetaveis_entidade ON etiquetaveis(tipo_etiquetavel, id_etiquetavel);

-- =====================================================
-- MÓDULO VENDAS
-- =====================================================

-- Pipelines
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    tipo_pipeline VARCHAR(50) DEFAULT 'vendas', -- vendas, suporte, customizado
    esta_ativo BOOLEAN DEFAULT true,
    ordem_exibicao INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL
);

-- Estágios do pipeline
CREATE TABLE estagios_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    nome_estagio VARCHAR(150) NOT NULL,
    descricao TEXT,
    percentual_probabilidade INTEGER DEFAULT 0, -- 0-100
    ordem_estagio INTEGER NOT NULL,
    eh_ganho_fechado BOOLEAN DEFAULT false,
    eh_perdido_fechado BOOLEAN DEFAULT false,
    cor VARCHAR(7),
    duracao_esperada_dias INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(pipeline_id, ordem_estagio)
);

-- Oportunidades
CREATE TABLE oportunidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id UUID REFERENCES contas(id),
    contato_id UUID REFERENCES contatos(id),
    pipeline_id UUID REFERENCES pipelines(id),
    estagio_id UUID REFERENCES estagios_pipeline(id),
    nome_oportunidade VARCHAR(255) NOT NULL,
    valor DECIMAL(15,2),
    receita_esperada DECIMAL(15,2),
    data_fechamento DATE,
    percentual_probabilidade INTEGER,
    origem_lead VARCHAR(100),
    proximo_passo TEXT,
    descricao TEXT,
    proprietario_id UUID REFERENCES auth.users(id),
    tipo VARCHAR(50), -- novo_negocio, negocio_existente, renovacao
    motivo_perda VARCHAR(255),
    concorrentes TEXT,
    esta_fechada BOOLEAN DEFAULT false,
    foi_ganha BOOLEAN DEFAULT false,
    fechada_em TIMESTAMP WITH TIME ZONE,
    dias_no_estagio INTEGER DEFAULT 0,
    ultima_mudanca_estagio_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_oportunidades_estagio ON oportunidades(estagio_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_oportunidades_proprietario ON oportunidades(proprietario_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_oportunidades_conta ON oportunidades(conta_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_oportunidades_pipeline ON oportunidades(pipeline_id) WHERE excluido_em IS NULL;

-- Histórico de mudança de estágio
CREATE TABLE historico_estagio_oportunidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidade_id UUID REFERENCES oportunidades(id) ON DELETE CASCADE,
    estagio_anterior_id UUID REFERENCES estagios_pipeline(id),
    estagio_novo_id UUID REFERENCES estagios_pipeline(id),
    alterado_por UUID REFERENCES auth.users(id),
    alterado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    dias_no_estagio_anterior INTEGER,
    observacoes TEXT
);

CREATE INDEX idx_hist_estagio_oportunidade ON historico_estagio_oportunidade(oportunidade_id, alterado_em DESC);

-- Produtos
CREATE TABLE produtos_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_produto VARCHAR(50) UNIQUE,
    nome_produto VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    familia_produto VARCHAR(100),
    preco_unitario DECIMAL(15,2),
    preco_custo DECIMAL(15,2),
    taxa_imposto DECIMAL(5,2),
    esta_ativo BOOLEAN DEFAULT true,
    eh_recorrente BOOLEAN DEFAULT false,
    frequencia_cobranca VARCHAR(50), -- mensal, trimestral, anual
    quantidade_disponivel INTEGER,
    nivel_reposicao INTEGER,
    fornecedor VARCHAR(255),
    sku VARCHAR(100),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_produtos_codigo ON produtos_catalogo(codigo_produto) WHERE excluido_em IS NULL;
CREATE INDEX idx_produtos_ativo ON produtos_catalogo(esta_ativo) WHERE excluido_em IS NULL;

-- Itens de oportunidade
CREATE TABLE itens_linha_oportunidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidade_id UUID REFERENCES oportunidades(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos_catalogo(id),
    nome_produto VARCHAR(255),
    quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(15,2) NOT NULL,
    percentual_desconto DECIMAL(5,2) DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_imposto DECIMAL(15,2) DEFAULT 0,
    preco_total DECIMAL(15,2) GENERATED ALWAYS AS (
        (quantidade * preco_unitario) - valor_desconto + valor_imposto
    ) STORED,
    descricao TEXT,
    ordem_linha INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cotações
CREATE TABLE cotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cotacao VARCHAR(50) UNIQUE NOT NULL,
    oportunidade_id UUID REFERENCES oportunidades(id),
    conta_id UUID REFERENCES contas(id),
    contato_id UUID REFERENCES contatos(id),
    nome_cotacao VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'rascunho', -- rascunho, enviada, aceita, rejeitada, expirada
    subtotal DECIMAL(15,2),
    total_desconto DECIMAL(15,2),
    total_imposto DECIMAL(15,2),
    total_geral DECIMAL(15,2),
    valida_ate DATE,
    termos_condicoes TEXT,
    observacoes TEXT,
    url_pdf VARCHAR(500),
    versao INTEGER DEFAULT 1,
    cotacao_pai_id UUID REFERENCES cotacoes(id),
    enviada_em TIMESTAMP WITH TIME ZONE,
    aceita_em TIMESTAMP WITH TIME ZONE,
    rejeitada_em TIMESTAMP WITH TIME ZONE,
    proprietario_id UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID REFERENCES auth.users(id)
);

-- Itens da cotação
CREATE TABLE itens_linha_cotacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID REFERENCES cotacoes(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos_catalogo(id),
    nome_produto VARCHAR(255),
    quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(15,2) NOT NULL,
    percentual_desconto DECIMAL(5,2) DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_imposto DECIMAL(15,2) DEFAULT 0,
    preco_total DECIMAL(15,2),
    descricao TEXT,
    ordem_linha INTEGER
);

-- =====================================================
-- TRIGGERS UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Empresas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar empresas ativas"
    ON empresas FOR SELECT
    USING (esta_ativa = true AND excluido_em IS NULL);

CREATE POLICY "Admins podem gerenciar empresas"
    ON empresas FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Perfis de usuário
ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil"
    ON perfis_usuario FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON perfis_usuario FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins podem gerenciar todos os perfis"
    ON perfis_usuario FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Contas
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar contas"
    ON contas FOR SELECT
    USING (excluido_em IS NULL AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Sales e Managers podem criar contas"
    ON contas FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Proprietários e Managers podem atualizar contas"
    ON contas FOR UPDATE
    USING (proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins podem deletar contas"
    ON contas FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Contatos
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar contatos"
    ON contatos FOR SELECT
    USING (excluido_em IS NULL AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Sales e Managers podem criar contatos"
    ON contatos FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Proprietários e Managers podem atualizar contatos"
    ON contatos FOR UPDATE
    USING (proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins podem deletar contatos"
    ON contatos FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Oportunidades
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar oportunidades"
    ON oportunidades FOR SELECT
    USING (excluido_em IS NULL AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Sales podem criar oportunidades"
    ON oportunidades FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Proprietários e Managers podem atualizar oportunidades"
    ON oportunidades FOR UPDATE
    USING (proprietario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins podem deletar oportunidades"
    ON oportunidades FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Produtos
ALTER TABLE produtos_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar produtos ativos"
    ON produtos_catalogo FOR SELECT
    USING (esta_ativo = true AND excluido_em IS NULL);

CREATE POLICY "Admins e Managers podem gerenciar produtos"
    ON produtos_catalogo FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Pipelines
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar pipelines ativos"
    ON pipelines FOR SELECT
    USING (esta_ativo = true AND excluido_em IS NULL);

CREATE POLICY "Admins podem gerenciar pipelines"
    ON pipelines FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Estágios de pipeline
ALTER TABLE estagios_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar estágios"
    ON estagios_pipeline FOR SELECT
    USING (true);

CREATE POLICY "Admins podem gerenciar estágios"
    ON estagios_pipeline FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar tags"
    ON tags FOR SELECT
    USING (true);

CREATE POLICY "Usuários autenticados podem criar tags"
    ON tags FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Endereços
ALTER TABLE enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem gerenciar endereços"
    ON enderecos FOR ALL
    USING (auth.uid() IS NOT NULL);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Pipeline padrão de vendas
INSERT INTO pipelines (nome, descricao, tipo_pipeline, ordem_exibicao) VALUES
('Pipeline de Vendas Padrão', 'Pipeline principal para gestão de vendas', 'vendas', 1);

-- Estágios do pipeline
INSERT INTO estagios_pipeline (pipeline_id, nome_estagio, descricao, percentual_probabilidade, ordem_estagio, cor) 
SELECT 
    id,
    'Prospecção',
    'Identificação e qualificação inicial de leads',
    10,
    1,
    '#94a3b8'
FROM pipelines WHERE nome = 'Pipeline de Vendas Padrão';

INSERT INTO estagios_pipeline (pipeline_id, nome_estagio, descricao, percentual_probabilidade, ordem_estagio, cor) 
SELECT 
    id,
    'Qualificação',
    'Validação de necessidades e fit',
    25,
    2,
    '#60a5fa'
FROM pipelines WHERE nome = 'Pipeline de Vendas Padrão';

INSERT INTO estagios_pipeline (pipeline_id, nome_estagio, descricao, percentual_probabilidade, ordem_estagio, cor) 
SELECT 
    id,
    'Proposta',
    'Apresentação e negociação',
    50,
    3,
    '#fbbf24'
FROM pipelines WHERE nome = 'Pipeline de Vendas Padrão';

INSERT INTO estagios_pipeline (pipeline_id, nome_estagio, descricao, percentual_probabilidade, ordem_estagio, cor) 
SELECT 
    id,
    'Negociação',
    'Ajustes finais e aprovações',
    75,
    4,
    '#f97316'
FROM pipelines WHERE nome = 'Pipeline de Vendas Padrão';

INSERT INTO estagios_pipeline (pipeline_id, nome_estagio, descricao, percentual_probabilidade, ordem_estagio, cor, eh_ganho_fechado) 
SELECT 
    id,
    'Ganho',
    'Negócio fechado com sucesso',
    100,
    5,
    '#22c55e',
    true
FROM pipelines WHERE nome = 'Pipeline de Vendas Padrão';

INSERT INTO estagios_pipeline (pipeline_id, nome_estagio, descricao, percentual_probabilidade, ordem_estagio, cor, eh_perdido_fechado) 
SELECT 
    id,
    'Perdido',
    'Negócio não concretizado',
    0,
    6,
    '#ef4444',
    true
FROM pipelines WHERE nome = 'Pipeline de Vendas Padrão';

-- Perfis padrão
INSERT INTO perfis (nome, descricao, eh_perfil_sistema) VALUES
('Administrador', 'Acesso total ao sistema', true),
('Gerente de Vendas', 'Gestão de equipe e pipeline', true),
('Vendedor', 'Gestão de oportunidades e contatos', true),
('Suporte', 'Acesso limitado para suporte', true);