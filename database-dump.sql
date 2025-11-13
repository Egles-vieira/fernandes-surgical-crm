-- =====================================================
-- DUMP COMPLETO DO BANCO DE DADOS
-- Projeto: Sistema de Gestão Comercial
-- Data: 2025-11-13
-- =====================================================

-- =====================================================
-- 1. EXTENSÕES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "btree_gin" WITH SCHEMA "public";

-- =====================================================
-- 2. TIPOS CUSTOMIZADOS (ENUMs)
-- =====================================================

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'sales',
    'warehouse',
    'support',
    'diretor_comercial',
    'gerente_comercial',
    'coordenador_comercial',
    'gestor_equipe',
    'lider',
    'representante_comercial',
    'executivo_contas',
    'backoffice'
);

CREATE TYPE public.etapa_pipeline AS ENUM (
    'prospeccao',
    'qualificacao',
    'proposta',
    'negociacao',
    'fechamento',
    'ganho',
    'perdido'
);

CREATE TYPE public.prioridade_ticket AS ENUM (
    'baixa',
    'media',
    'alta',
    'urgente'
);

CREATE TYPE public.status_ticket AS ENUM (
    'aberto',
    'em_andamento',
    'aguardando_cliente',
    'aguardando_interno',
    'resolvido',
    'fechado',
    'cancelado'
);

CREATE TYPE public.tipo_interacao_ticket AS ENUM (
    'comentario',
    'status_mudou',
    'prioridade_mudou',
    'atribuicao_mudou',
    'ticket_pausado',
    'ticket_retomado',
    'ticket_transferido',
    'anexo_adicionado'
);

CREATE TYPE public.tipo_endereco AS ENUM (
    'principal',
    'entrega',
    'cobranca',
    'comercial'
);

CREATE TYPE public.status_solicitacao_cadastro AS ENUM (
    'pendente',
    'em_analise',
    'aprovado',
    'rejeitado',
    'cancelado'
);

CREATE TYPE public.status_analise_ia AS ENUM (
    'pendente',
    'analisando',
    'concluida',
    'erro',
    'cancelada'
);

CREATE TYPE public.step_cotacao AS ENUM (
    'recebida',
    'vinculando_produtos',
    'analisando_ia',
    'revisao_manual',
    'precificando',
    'aguardando_aprovacao',
    'respondida',
    'expirada',
    'cancelada'
);

CREATE TYPE public.status_item_cotacao AS ENUM (
    'pendente',
    'vinculado',
    'sem_vinculo',
    'alternativa_sugerida',
    'preco_definido',
    'aprovado'
);

CREATE TYPE public.tipo_equipe AS ENUM (
    'vendas',
    'suporte',
    'backoffice',
    'gestao'
);

CREATE TYPE public.status_atendimento AS ENUM (
    'online',
    'ocupado',
    'ausente',
    'offline'
);

-- =====================================================
-- 3. TABELAS - ORDEM DE DEPENDÊNCIAS
-- =====================================================

-- -----------------------------------------------------
-- Tabela: configuracoes_sistema
-- -----------------------------------------------------
CREATE TABLE public.configuracoes_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT NOT NULL UNIQUE,
    valor JSONB NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.configuracoes_sistema IS 'Configurações globais do sistema';

-- -----------------------------------------------------
-- Tabela: perfis_usuario
-- -----------------------------------------------------
CREATE TABLE public.perfis_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    primeiro_nome TEXT,
    sobrenome TEXT,
    telefone TEXT,
    avatar_url TEXT,
    cargo TEXT,
    departamento TEXT,
    data_nascimento DATE,
    preferencias JSONB DEFAULT '{}'::jsonb,
    status_atendimento status_atendimento DEFAULT 'offline',
    ultima_mudanca_status TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.perfis_usuario IS 'Perfis estendidos dos usuários do sistema';

-- -----------------------------------------------------
-- Tabela: historico_status_atendimento
-- -----------------------------------------------------
CREATE TABLE public.historico_status_atendimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.perfis_usuario(id) ON DELETE CASCADE,
    status_anterior status_atendimento,
    status_novo status_atendimento NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.historico_status_atendimento IS 'Histórico de mudanças de status de atendimento dos usuários';

-- -----------------------------------------------------
-- Tabela: user_roles
-- -----------------------------------------------------
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    vendedor_vinculado_id UUID REFERENCES public.perfis_usuario(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

COMMENT ON TABLE public.user_roles IS 'Papéis e permissões dos usuários';

-- -----------------------------------------------------
-- Tabela: role_hierarquia
-- -----------------------------------------------------
CREATE TABLE public.role_hierarquia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL UNIQUE,
    nivel INTEGER NOT NULL,
    pode_gerenciar_roles app_role[] DEFAULT ARRAY[]::app_role[]
);

COMMENT ON TABLE public.role_hierarquia IS 'Hierarquia de papéis no sistema';

-- -----------------------------------------------------
-- Tabela: permissoes
-- -----------------------------------------------------
CREATE TABLE public.permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo VARCHAR(100) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT,
    UNIQUE(modulo, acao)
);

COMMENT ON TABLE public.permissoes IS 'Permissões disponíveis no sistema';

-- -----------------------------------------------------
-- Tabela: role_permissoes
-- -----------------------------------------------------
CREATE TABLE public.role_permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permissao_id UUID NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
    UNIQUE(role, permissao_id)
);

COMMENT ON TABLE public.role_permissoes IS 'Mapeamento de permissões por papel';

-- -----------------------------------------------------
-- Tabela: equipes
-- -----------------------------------------------------
CREATE TABLE public.equipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo_equipe tipo_equipe DEFAULT 'vendas',
    lider_equipe_id UUID REFERENCES public.perfis_usuario(id) ON DELETE SET NULL,
    gestor_id UUID REFERENCES public.perfis_usuario(id) ON DELETE SET NULL,
    esta_ativa BOOLEAN DEFAULT true,
    meta_mensal NUMERIC(15,2),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    excluido_em TIMESTAMPTZ,
    criado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.equipes IS 'Equipes de trabalho (vendas, suporte, etc)';

-- -----------------------------------------------------
-- Tabela: membros_equipe
-- -----------------------------------------------------
CREATE TABLE public.membros_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.perfis_usuario(id) ON DELETE CASCADE,
    data_entrada DATE DEFAULT CURRENT_DATE,
    data_saida DATE,
    papel_equipe VARCHAR(50),
    carga_trabalho INTEGER DEFAULT 100,
    esta_ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(equipe_id, usuario_id)
);

COMMENT ON TABLE public.membros_equipe IS 'Membros das equipes';

-- -----------------------------------------------------
-- Tabela: historico_membros_equipe
-- -----------------------------------------------------
CREATE TABLE public.historico_membros_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id),
    usuario_id UUID NOT NULL REFERENCES public.perfis_usuario(id),
    tipo_evento VARCHAR(50) NOT NULL,
    equipe_origem_id UUID REFERENCES public.equipes(id),
    equipe_destino_id UUID REFERENCES public.equipes(id),
    papel_anterior VARCHAR(50),
    papel_novo VARCHAR(50),
    carga_trabalho_anterior INTEGER,
    carga_trabalho_nova INTEGER,
    dias_na_equipe INTEGER,
    motivo TEXT,
    realizado_por UUID REFERENCES public.perfis_usuario(id),
    realizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.historico_membros_equipe IS 'Histórico de mudanças de membros de equipes';

-- -----------------------------------------------------
-- Tabela: historico_atividades_equipe
-- -----------------------------------------------------
CREATE TABLE public.historico_atividades_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id),
    tipo_atividade VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    realizado_por UUID REFERENCES public.perfis_usuario(id),
    realizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.historico_atividades_equipe IS 'Histórico de atividades das equipes';

-- -----------------------------------------------------
-- Tabela: historico_lideranca_equipe
-- -----------------------------------------------------
CREATE TABLE public.historico_lideranca_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id),
    lider_anterior_id UUID REFERENCES public.perfis_usuario(id),
    lider_novo_id UUID NOT NULL REFERENCES public.perfis_usuario(id),
    motivo TEXT,
    alterado_por UUID REFERENCES public.perfis_usuario(id),
    alterado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.historico_lideranca_equipe IS 'Histórico de mudanças de liderança das equipes';

-- -----------------------------------------------------
-- Tabela: metas_equipe
-- -----------------------------------------------------
CREATE TABLE public.metas_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo_meta TEXT NOT NULL,
    metrica TEXT NOT NULL,
    unidade_medida TEXT,
    valor_objetivo NUMERIC(15,2) NOT NULL,
    valor_atual NUMERIC(15,2) DEFAULT 0,
    periodo_inicio TIMESTAMPTZ NOT NULL,
    periodo_fim TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'ativa',
    prioridade TEXT DEFAULT 'media',
    alerta_percentual INTEGER DEFAULT 80,
    criado_por UUID REFERENCES public.perfis_usuario(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    concluido_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    CHECK (valor_objetivo > 0),
    CHECK (valor_atual >= 0),
    CHECK (periodo_fim > periodo_inicio),
    CHECK (alerta_percentual BETWEEN 1 AND 100)
);

COMMENT ON TABLE public.metas_equipe IS 'Metas das equipes';

-- -----------------------------------------------------
-- Tabela: metas_vendedor
-- -----------------------------------------------------
CREATE TABLE public.metas_vendedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID NOT NULL REFERENCES public.perfis_usuario(id) ON DELETE CASCADE,
    equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo_meta TEXT NOT NULL,
    metrica TEXT NOT NULL,
    unidade_medida TEXT,
    meta_valor NUMERIC(15,2) NOT NULL,
    realizado_valor NUMERIC(15,2) DEFAULT 0,
    periodo_inicio TIMESTAMPTZ NOT NULL,
    periodo_fim TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'ativa',
    prioridade TEXT DEFAULT 'media',
    alerta_percentual INTEGER DEFAULT 80,
    criado_por UUID REFERENCES public.perfis_usuario(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    concluido_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    CHECK (meta_valor > 0),
    CHECK (realizado_valor >= 0),
    CHECK (periodo_fim > periodo_inicio),
    CHECK (alerta_percentual BETWEEN 1 AND 100)
);

COMMENT ON TABLE public.metas_vendedor IS 'Metas individuais dos vendedores';

-- -----------------------------------------------------
-- Tabela: progresso_metas
-- -----------------------------------------------------
CREATE TABLE public.progresso_metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_id UUID NOT NULL,
    valor_anterior NUMERIC(15,2) NOT NULL,
    valor_novo NUMERIC(15,2) NOT NULL,
    diferenca NUMERIC(15,2) GENERATED ALWAYS AS (valor_novo - valor_anterior) STORED,
    percentual_conclusao NUMERIC(5,2),
    origem TEXT,
    referencia_id UUID,
    observacao TEXT,
    registrado_por UUID REFERENCES public.perfis_usuario(id),
    registrado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.progresso_metas IS 'Histórico de progresso das metas';

-- -----------------------------------------------------
-- Tabela: condicoes_pagamento
-- -----------------------------------------------------
CREATE TABLE public.condicoes_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    parcelas INTEGER DEFAULT 1,
    dias_primeira_parcela INTEGER DEFAULT 0,
    dias_entre_parcelas INTEGER DEFAULT 30,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.condicoes_pagamento IS 'Condições de pagamento disponíveis';

-- -----------------------------------------------------
-- Tabela: tipos_frete
-- -----------------------------------------------------
CREATE TABLE public.tipos_frete (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.tipos_frete IS 'Tipos de frete disponíveis';

-- -----------------------------------------------------
-- Tabela: tipos_pedido
-- -----------------------------------------------------
CREATE TABLE public.tipos_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.tipos_pedido IS 'Tipos de pedido disponíveis';

-- -----------------------------------------------------
-- Tabela: produtos
-- -----------------------------------------------------
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    unidade_medida VARCHAR(20),
    preco_custo NUMERIC(15,2),
    preco_venda NUMERIC(15,2),
    margem_minima NUMERIC(5,2),
    estoque_atual NUMERIC(15,3) DEFAULT 0,
    estoque_minimo NUMERIC(15,3) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    codigo_barras VARCHAR(50),
    ncm VARCHAR(10),
    peso_bruto NUMERIC(10,3),
    peso_liquido NUMERIC(10,3),
    foto_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.produtos IS 'Catálogo de produtos';

-- -----------------------------------------------------
-- Tabela: contas
-- -----------------------------------------------------
CREATE TABLE public.contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_conta VARCHAR(200) NOT NULL,
    cnpj VARCHAR(18),
    tipo_conta VARCHAR(50),
    setor VARCHAR(100),
    site VARCHAR(200),
    telefone_principal VARCHAR(20),
    email_principal VARCHAR(100),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    proprietario_id UUID REFERENCES public.perfis_usuario(id),
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.contas IS 'Contas de clientes (empresas)';

-- -----------------------------------------------------
-- Tabela: clientes
-- -----------------------------------------------------
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE,
    cgc VARCHAR(18),
    nome VARCHAR(200),
    nome_abrev VARCHAR(100),
    endereco VARCHAR(200),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    ibge VARCHAR(10),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    email VARCHAR(100),
    ins_estadual VARCHAR(20),
    ins_municipal VARCHAR(20),
    atividade VARCHAR(100),
    cod_pais VARCHAR(5),
    data_cadastro DATE DEFAULT CURRENT_DATE,
    ativo BOOLEAN DEFAULT true,
    user_id UUID REFERENCES public.perfis_usuario(id),
    conta_id UUID REFERENCES public.contas(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.clientes IS 'Cadastro de clientes';

-- -----------------------------------------------------
-- Tabela: usuario_clientes_vinculo
-- -----------------------------------------------------
CREATE TABLE public.usuario_clientes_vinculo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.perfis_usuario(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    tipo_vinculo VARCHAR(50) DEFAULT 'principal',
    data_inicio DATE DEFAULT CURRENT_DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(usuario_id, cliente_id, tipo_vinculo)
);

COMMENT ON TABLE public.usuario_clientes_vinculo IS 'Vínculo entre usuários (vendedores) e clientes';

-- -----------------------------------------------------
-- Tabela: contatos
-- -----------------------------------------------------
CREATE TABLE public.contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    sobrenome VARCHAR(200),
    email VARCHAR(100),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    data_nascimento DATE,
    eh_principal BOOLEAN DEFAULT false,
    conta_id UUID REFERENCES public.contas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.contatos IS 'Contatos de clientes';

-- -----------------------------------------------------
-- Tabela: enderecos_clientes
-- -----------------------------------------------------
CREATE TABLE public.enderecos_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    tipo tipo_endereco DEFAULT 'principal',
    cod_entrega VARCHAR(20) DEFAULT 'Padrão',
    endereco VARCHAR(200) NOT NULL,
    cep VARCHAR(10) NOT NULL,
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    ibge VARCHAR(10),
    estado VARCHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil',
    ins_estadual VARCHAR(20),
    hora_entrega TIME,
    is_principal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.enderecos_clientes IS 'Endereços dos clientes';

-- -----------------------------------------------------
-- Tabela: cliente_inscricoes_estaduais
-- -----------------------------------------------------
CREATE TABLE public.cliente_inscricoes_estaduais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    uf TEXT NOT NULL,
    inscricao_estadual TEXT,
    situacao TEXT,
    data_inicio DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE public.cliente_inscricoes_estaduais IS 'Inscrições estaduais dos clientes';

-- -----------------------------------------------------
-- Tabela: cliente_documentos
-- -----------------------------------------------------
CREATE TABLE public.cliente_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    arquivo_url TEXT,
    arquivo_nome TEXT,
    tamanho_bytes INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE public.cliente_documentos IS 'Documentos anexados aos clientes';

-- -----------------------------------------------------
-- Tabela: cliente_filiais
-- -----------------------------------------------------
CREATE TABLE public.cliente_filiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_matriz_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    cnpj TEXT NOT NULL,
    nome_fantasia TEXT,
    razao_social TEXT,
    endereco JSONB,
    telefones JSONB,
    emails JSONB,
    created_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE public.cliente_filiais IS 'Filiais dos clientes';

-- -----------------------------------------------------
-- Tabela: perfis_sociais
-- -----------------------------------------------------
CREATE TABLE public.perfis_sociais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contato_id UUID REFERENCES public.contatos(id) ON DELETE CASCADE,
    conta_id UUID REFERENCES public.contas(id) ON DELETE CASCADE,
    plataforma VARCHAR(50) NOT NULL,
    url_perfil VARCHAR(200),
    nome_usuario VARCHAR(100),
    numero_seguidores INTEGER,
    ultima_sincronizacao_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.perfis_sociais IS 'Perfis sociais de contatos e contas';

-- -----------------------------------------------------
-- Tabela: interacoes
-- -----------------------------------------------------
CREATE TABLE public.interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.perfis_usuario(id),
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    data_interacao TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.interacoes IS 'Interações com clientes';

-- -----------------------------------------------------
-- Tabela: pipelines
-- -----------------------------------------------------
CREATE TABLE public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'vendas',
    esta_ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.pipelines IS 'Pipelines de vendas/processos';

-- -----------------------------------------------------
-- Tabela: estagios_pipeline
-- -----------------------------------------------------
CREATE TABLE public.estagios_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INTEGER NOT NULL,
    probabilidade INTEGER DEFAULT 50,
    rotacao_dias INTEGER,
    cor VARCHAR(20),
    eh_final BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pipeline_id, ordem)
);

COMMENT ON TABLE public.estagios_pipeline IS 'Estágios dos pipelines';

-- -----------------------------------------------------
-- Tabela: oportunidades
-- -----------------------------------------------------
CREATE TABLE public.oportunidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_oportunidade VARCHAR(200) NOT NULL,
    conta_id UUID REFERENCES public.contas(id),
    contato_id UUID REFERENCES public.contatos(id),
    pipeline_id UUID REFERENCES public.pipelines(id),
    estagio_id UUID REFERENCES public.estagios_pipeline(id),
    valor NUMERIC(15,2),
    receita_esperada NUMERIC(15,2),
    data_fechamento DATE,
    percentual_probabilidade INTEGER,
    proprietario_id UUID REFERENCES public.perfis_usuario(id),
    vendedor_id UUID REFERENCES public.perfis_usuario(id),
    equipe_id UUID REFERENCES public.equipes(id),
    origem_lead VARCHAR(100),
    tipo VARCHAR(50),
    descricao TEXT,
    proximo_passo TEXT,
    esta_fechada BOOLEAN DEFAULT false,
    foi_ganha BOOLEAN DEFAULT false,
    fechada_em TIMESTAMPTZ,
    motivo_perda VARCHAR(200),
    concorrentes TEXT,
    dias_no_estagio INTEGER DEFAULT 0,
    ultima_mudanca_estagio_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    excluido_em TIMESTAMPTZ,
    criado_por UUID REFERENCES public.perfis_usuario(id),
    atualizado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.oportunidades IS 'Oportunidades de vendas';

-- -----------------------------------------------------
-- Tabela: historico_estagio_oportunidade
-- -----------------------------------------------------
CREATE TABLE public.historico_estagio_oportunidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE CASCADE,
    estagio_anterior_id UUID REFERENCES public.estagios_pipeline(id),
    estagio_novo_id UUID REFERENCES public.estagios_pipeline(id),
    dias_no_estagio_anterior INTEGER,
    observacoes TEXT,
    alterado_por UUID REFERENCES public.perfis_usuario(id),
    alterado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.historico_estagio_oportunidade IS 'Histórico de mudanças de estágio das oportunidades';

-- -----------------------------------------------------
-- Tabela: itens_linha_oportunidade
-- -----------------------------------------------------
CREATE TABLE public.itens_linha_oportunidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id),
    nome_produto VARCHAR(200),
    descricao TEXT,
    quantidade NUMERIC(15,3) DEFAULT 1,
    preco_unitario NUMERIC(15,2) NOT NULL,
    percentual_desconto NUMERIC(5,2) DEFAULT 0,
    valor_desconto NUMERIC(15,2) DEFAULT 0,
    valor_imposto NUMERIC(15,2) DEFAULT 0,
    preco_total NUMERIC(15,2),
    ordem_linha INTEGER,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.itens_linha_oportunidade IS 'Itens das oportunidades';

-- -----------------------------------------------------
-- Tabela: vendas
-- -----------------------------------------------------
CREATE TABLE public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_venda TEXT NOT NULL UNIQUE,
    cliente_id UUID REFERENCES public.clientes(id),
    cliente_nome TEXT NOT NULL,
    cliente_cnpj TEXT,
    data_venda TIMESTAMPTZ DEFAULT now(),
    valor_total NUMERIC(15,2) DEFAULT 0.00,
    desconto NUMERIC(15,2) DEFAULT 0.00,
    valor_final NUMERIC(15,2) DEFAULT 0.00,
    valor_estimado NUMERIC(15,2) DEFAULT 0.00,
    probabilidade INTEGER DEFAULT 50,
    data_fechamento_prevista DATE,
    status TEXT DEFAULT 'rascunho',
    etapa_pipeline etapa_pipeline DEFAULT 'prospeccao',
    origem_lead TEXT,
    observacoes TEXT,
    motivo_perda TEXT,
    user_id UUID NOT NULL REFERENCES public.perfis_usuario(id),
    responsavel_id UUID REFERENCES public.perfis_usuario(id),
    vendedor_id UUID REFERENCES public.perfis_usuario(id),
    equipe_id UUID REFERENCES public.equipes(id),
    condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
    tipo_frete_id UUID REFERENCES public.tipos_frete(id),
    tipo_pedido_id UUID REFERENCES public.tipos_pedido(id),
    requer_aprovacao BOOLEAN DEFAULT false,
    aprovado_por UUID REFERENCES public.perfis_usuario(id),
    aprovado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (valor_total >= 0),
    CHECK (desconto >= 0),
    CHECK (valor_final >= 0),
    CHECK (probabilidade BETWEEN 0 AND 100)
);

COMMENT ON TABLE public.vendas IS 'Vendas realizadas';

-- -----------------------------------------------------
-- Tabela: itens_venda
-- -----------------------------------------------------
CREATE TABLE public.itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id),
    nome_produto VARCHAR(200),
    quantidade NUMERIC(15,3) DEFAULT 1,
    preco_unitario NUMERIC(15,2) NOT NULL,
    desconto NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.itens_venda IS 'Itens das vendas';

-- -----------------------------------------------------
-- Tabela: cotacoes
-- -----------------------------------------------------
CREATE TABLE public.cotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cotacao VARCHAR(50) NOT NULL UNIQUE,
    conta_id UUID REFERENCES public.contas(id),
    contato_id UUID REFERENCES public.contatos(id),
    data_cotacao DATE DEFAULT CURRENT_DATE,
    data_validade DATE,
    valor_total NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'rascunho',
    observacoes TEXT,
    proprietario_id UUID REFERENCES public.perfis_usuario(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.cotacoes IS 'Cotações de vendas';

-- -----------------------------------------------------
-- Tabela: itens_linha_cotacao
-- -----------------------------------------------------
CREATE TABLE public.itens_linha_cotacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID REFERENCES public.cotacoes(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id),
    nome_produto VARCHAR(200),
    descricao TEXT,
    quantidade NUMERIC(15,3) DEFAULT 1,
    preco_unitario NUMERIC(15,2) NOT NULL,
    percentual_desconto NUMERIC(5,2) DEFAULT 0,
    valor_desconto NUMERIC(15,2) DEFAULT 0,
    valor_imposto NUMERIC(15,2) DEFAULT 0,
    preco_total NUMERIC(15,2),
    ordem_linha INTEGER
);

COMMENT ON TABLE public.itens_linha_cotacao IS 'Itens das cotações';

-- -----------------------------------------------------
-- Tabela: filas_atendimento
-- -----------------------------------------------------
CREATE TABLE public.filas_atendimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    cor TEXT DEFAULT '#3B82F6',
    ordem INTEGER DEFAULT 0,
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.filas_atendimento IS 'Filas de atendimento de tickets';

-- -----------------------------------------------------
-- Tabela: tickets
-- -----------------------------------------------------
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ticket TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status status_ticket DEFAULT 'aberto',
    prioridade prioridade_ticket DEFAULT 'media',
    categoria TEXT,
    subcategoria TEXT,
    tags TEXT[],
    cliente_id UUID REFERENCES public.clientes(id),
    conta_id UUID REFERENCES public.contas(id),
    contato_id UUID REFERENCES public.contatos(id),
    criado_por UUID NOT NULL REFERENCES public.perfis_usuario(id),
    atribuido_para UUID REFERENCES public.perfis_usuario(id),
    fila_id UUID REFERENCES public.filas_atendimento(id),
    data_abertura TIMESTAMPTZ DEFAULT now(),
    data_vencimento TIMESTAMPTZ,
    resolvido_em TIMESTAMPTZ,
    fechado_em TIMESTAMPTZ,
    tempo_primeira_resposta_min INTEGER,
    tempo_resolucao_min INTEGER,
    tempo_pausado_horas INTEGER DEFAULT 0,
    esta_pausado BOOLEAN DEFAULT false,
    pausado_em TIMESTAMPTZ,
    motivo_pausa TEXT,
    total_interacoes INTEGER DEFAULT 0,
    canal_origem TEXT,
    nivel_satisfacao INTEGER,
    feedback_cliente TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.tickets IS 'Tickets de suporte';

-- -----------------------------------------------------
-- Tabela: tickets_interacoes
-- -----------------------------------------------------
CREATE TABLE public.tickets_interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    tipo_interacao tipo_interacao_ticket NOT NULL,
    mensagem TEXT,
    mensagem_interna BOOLEAN DEFAULT false,
    valor_anterior TEXT,
    valor_novo TEXT,
    anexos JSONB,
    criado_por UUID REFERENCES public.perfis_usuario(id),
    nome_autor TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.tickets_interacoes IS 'Interações e histórico dos tickets';

-- -----------------------------------------------------
-- Tabela: tickets_pausas
-- -----------------------------------------------------
CREATE TABLE public.tickets_pausas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    pausado_por UUID REFERENCES public.perfis_usuario(id),
    pausado_em TIMESTAMPTZ DEFAULT now(),
    retomado_por UUID REFERENCES public.perfis_usuario(id),
    retomado_em TIMESTAMPTZ,
    duracao_horas INTEGER
);

COMMENT ON TABLE public.tickets_pausas IS 'Histórico de pausas dos tickets';

-- -----------------------------------------------------
-- Tabela: chat_assistente_mensagens
-- -----------------------------------------------------
CREATE TABLE public.chat_assistente_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.chat_assistente_mensagens IS 'Mensagens do chat assistente de IA';

-- -----------------------------------------------------
-- Tabela: notificacoes
-- -----------------------------------------------------
CREATE TABLE public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.perfis_usuario(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT false,
    link TEXT,
    dados JSONB,
    criada_em TIMESTAMPTZ DEFAULT now(),
    lida_em TIMESTAMPTZ
);

COMMENT ON TABLE public.notificacoes IS 'Notificações do sistema para usuários';

-- -----------------------------------------------------
-- Tabela: whatsapp_contas
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_conta VARCHAR(100) NOT NULL,
    numero_whatsapp VARCHAR(20) NOT NULL,
    provedor VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'ativo',
    -- Gupshup
    app_id_gupshup VARCHAR(100),
    api_key_gupshup VARCHAR(200),
    phone_number_id_gupshup VARCHAR(100),
    business_account_id VARCHAR(100),
    account_sid VARCHAR(100),
    -- W-API
    instance_id_wapi VARCHAR(100),
    token_wapi TEXT,
    webhook_received_url TEXT,
    webhook_delivery_url TEXT,
    webhook_status_url TEXT,
    webhook_connected_url TEXT,
    webhook_disconnected_url TEXT,
    -- Comum
    nome_exibicao VARCHAR(100),
    foto_perfil_url TEXT,
    descricao_negocio TEXT,
    categoria_negocio VARCHAR(100),
    site VARCHAR(200),
    email_contato VARCHAR(100),
    endereco TEXT,
    verificada BOOLEAN DEFAULT false,
    qualidade_conta VARCHAR(50),
    limite_mensagens_dia INTEGER DEFAULT 1000,
    resposta_automatica_ativa BOOLEAN DEFAULT true,
    mensagem_fora_horario TEXT,
    horario_atendimento JSONB,
    webhook_url VARCHAR(200),
    webhook_verificado BOOLEAN DEFAULT false,
    total_mensagens_enviadas INTEGER DEFAULT 0,
    total_mensagens_recebidas INTEGER DEFAULT 0,
    total_conversas INTEGER DEFAULT 0,
    ultima_sincronizacao_em TIMESTAMPTZ,
    conectada_em TIMESTAMPTZ,
    desconectada_em TIMESTAMPTZ,
    criado_por UUID NOT NULL REFERENCES public.perfis_usuario(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    excluido_em TIMESTAMPTZ
);

COMMENT ON TABLE public.whatsapp_contas IS 'Contas WhatsApp Business conectadas';

-- -----------------------------------------------------
-- Tabela: whatsapp_contatos
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID NOT NULL REFERENCES public.whatsapp_contas(id) ON DELETE CASCADE,
    numero_whatsapp VARCHAR(20) NOT NULL,
    nome VARCHAR(200),
    nome_salvo VARCHAR(200),
    foto_perfil_url TEXT,
    esta_bloqueado BOOLEAN DEFAULT false,
    etiquetas TEXT[],
    total_mensagens_enviadas INTEGER DEFAULT 0,
    total_mensagens_recebidas INTEGER DEFAULT 0,
    ultima_mensagem_em TIMESTAMPTZ,
    ultima_mensagem_enviada_em TIMESTAMPTZ,
    ultima_mensagem_recebida_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(whatsapp_conta_id, numero_whatsapp)
);

COMMENT ON TABLE public.whatsapp_contatos IS 'Contatos do WhatsApp';

-- -----------------------------------------------------
-- Tabela: whatsapp_conversas
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID NOT NULL REFERENCES public.whatsapp_contas(id) ON DELETE CASCADE,
    whatsapp_contato_id UUID NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id),
    atribuido_para UUID REFERENCES public.perfis_usuario(id),
    fila_id UUID REFERENCES public.filas_atendimento(id),
    status VARCHAR(50) DEFAULT 'aberta',
    prioridade VARCHAR(20) DEFAULT 'normal',
    etiquetas TEXT[],
    janela_24h_ativa BOOLEAN DEFAULT false,
    janela_aberta_em TIMESTAMPTZ,
    janela_fecha_em TIMESTAMPTZ,
    total_mensagens INTEGER DEFAULT 0,
    total_mensagens_enviadas INTEGER DEFAULT 0,
    total_mensagens_recebidas INTEGER DEFAULT 0,
    ultima_mensagem_em TIMESTAMPTZ,
    arquivada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_conversas IS 'Conversas do WhatsApp';

-- -----------------------------------------------------
-- Tabela: whatsapp_mensagens
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
    whatsapp_contato_id UUID NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
    mensagem_externa_id VARCHAR(100),
    direcao VARCHAR(20) NOT NULL,
    tipo_mensagem VARCHAR(50) DEFAULT 'texto',
    conteudo_texto TEXT,
    midia_url TEXT,
    midia_tipo VARCHAR(50),
    midia_tamanho INTEGER,
    midia_nome VARCHAR(200),
    status VARCHAR(50) DEFAULT 'enviando',
    timestamp_envio TIMESTAMPTZ,
    timestamp_entrega TIMESTAMPTZ,
    timestamp_leitura TIMESTAMPTZ,
    erro_mensagem TEXT,
    enviado_por UUID REFERENCES public.perfis_usuario(id),
    eh_template BOOLEAN DEFAULT false,
    template_nome VARCHAR(100),
    template_parametros JSONB,
    resposta_para_id UUID REFERENCES public.whatsapp_mensagens(id),
    botoes JSONB,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_mensagens IS 'Mensagens do WhatsApp';

-- -----------------------------------------------------
-- Tabela: whatsapp_templates
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID NOT NULL REFERENCES public.whatsapp_contas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    idioma VARCHAR(10) DEFAULT 'pt_BR',
    status VARCHAR(50),
    conteudo TEXT NOT NULL,
    componentes JSONB,
    parametros_exemplo JSONB,
    aprovado_em TIMESTAMPTZ,
    rejeitado_em TIMESTAMPTZ,
    motivo_rejeicao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(whatsapp_conta_id, nome)
);

COMMENT ON TABLE public.whatsapp_templates IS 'Templates de mensagens do WhatsApp';

-- -----------------------------------------------------
-- Tabela: whatsapp_respostas_rapidas
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_respostas_rapidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(100) NOT NULL,
    atalho VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    categoria VARCHAR(50),
    compartilhada BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES public.perfis_usuario(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_respostas_rapidas IS 'Respostas rápidas para WhatsApp';

-- -----------------------------------------------------
-- Tabela: whatsapp_webhooks_log
-- -----------------------------------------------------
CREATE TABLE public.whatsapp_webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID REFERENCES public.whatsapp_contas(id),
    provedor VARCHAR(50) NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    evento_externo_id VARCHAR(100),
    payload JSONB NOT NULL,
    headers JSONB,
    mensagem_id UUID REFERENCES public.whatsapp_mensagens(id),
    conversa_id UUID REFERENCES public.whatsapp_conversas(id),
    processado BOOLEAN DEFAULT false,
    processado_em TIMESTAMPTZ,
    tentativas_processamento INTEGER DEFAULT 0,
    erro_processamento TEXT,
    recebido_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_webhooks_log IS 'Log de webhooks do WhatsApp';

-- -----------------------------------------------------
-- Tabela: edi_plataformas
-- -----------------------------------------------------
CREATE TABLE public.edi_plataformas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(50),
    url_portal VARCHAR(200),
    email_contato VARCHAR(100),
    telefone_suporte VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.edi_plataformas IS 'Plataformas EDI conectadas';

-- -----------------------------------------------------
-- Tabela: edi_cotacoes
-- -----------------------------------------------------
CREATE TABLE public.edi_cotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plataforma_id UUID NOT NULL REFERENCES public.edi_plataformas(id),
    numero_cotacao VARCHAR(100) NOT NULL,
    numero_processo VARCHAR(100),
    cnpj_cliente VARCHAR(18) NOT NULL,
    nome_cliente VARCHAR(200),
    data_cotacao DATE,
    data_limite_resposta TIMESTAMPTZ,
    valor_total_estimado NUMERIC(15,2),
    step_atual step_cotacao DEFAULT 'recebida',
    status_geral VARCHAR(50) DEFAULT 'nova',
    historico_steps JSONB DEFAULT '[]'::jsonb,
    xml_original TEXT,
    metadados JSONB,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    respondido_em TIMESTAMPTZ,
    criado_por UUID REFERENCES public.perfis_usuario(id),
    responsavel_id UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.edi_cotacoes IS 'Cotações recebidas via EDI';

-- -----------------------------------------------------
-- Tabela: edi_itens_cotacao
-- -----------------------------------------------------
CREATE TABLE public.edi_itens_cotacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID NOT NULL REFERENCES public.edi_cotacoes(id) ON DELETE CASCADE,
    numero_item INTEGER NOT NULL,
    id_item_externo VARCHAR(100),
    codigo_produto_cliente VARCHAR(100),
    descricao_produto_cliente TEXT NOT NULL,
    quantidade_solicitada NUMERIC(15,3) NOT NULL,
    unidade_medida VARCHAR(20),
    preco_unitario_resposta NUMERIC(15,2),
    prazo_entrega_dias INTEGER,
    observacoes_item TEXT,
    status status_item_cotacao DEFAULT 'pendente',
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_itens_cotacao IS 'Itens das cotações EDI';

-- -----------------------------------------------------
-- Tabela: edi_produtos_vinculo
-- -----------------------------------------------------
CREATE TABLE public.edi_produtos_vinculo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plataforma_id UUID REFERENCES public.edi_plataformas(id),
    produto_id UUID REFERENCES public.produtos(id),
    cnpj_cliente VARCHAR(18) NOT NULL,
    codigo_produto_cliente VARCHAR(100),
    descricao_cliente TEXT,
    codigo_ean VARCHAR(50),
    codigo_simpro VARCHAR(50),
    codigo_produto_fornecedor VARCHAR(50),
    sugerido_por_ia BOOLEAN DEFAULT false,
    score_confianca NUMERIC(5,2),
    prompt_ia TEXT,
    resposta_ia JSONB,
    sugerido_em TIMESTAMPTZ,
    aprovado_por UUID REFERENCES public.perfis_usuario(id),
    aprovado_em TIMESTAMPTZ,
    eh_produto_alternativo BOOLEAN DEFAULT false,
    ordem_prioridade INTEGER DEFAULT 1,
    preco_padrao NUMERIC(15,2),
    desconto_padrao NUMERIC(5,2) DEFAULT 0,
    estoque_minimo NUMERIC(15,3),
    ultima_cotacao_em TIMESTAMPTZ,
    ultimo_preco_respondido NUMERIC(15,2),
    total_cotacoes_respondidas INTEGER DEFAULT 0,
    total_pedidos_ganhos INTEGER DEFAULT 0,
    total_pedidos_perdidos INTEGER DEFAULT 0,
    taxa_conversao NUMERIC(5,2) DEFAULT 0,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_produtos_vinculo IS 'Vínculo entre produtos internos e códigos das plataformas EDI';

-- -----------------------------------------------------
-- Tabela: edi_sugestoes_ia
-- -----------------------------------------------------
CREATE TABLE public.edi_sugestoes_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_cotacao_id UUID NOT NULL REFERENCES public.edi_itens_cotacao(id) ON DELETE CASCADE,
    vinculo_id UUID REFERENCES public.edi_produtos_vinculo(id),
    produto_id UUID REFERENCES public.produtos(id),
    score_confianca NUMERIC(5,2),
    ordem_sugestao INTEGER,
    justificativa TEXT,
    prompt_utilizado TEXT,
    resposta_completa_ia JSONB,
    modelo_ia VARCHAR(100),
    tempo_processamento_ms INTEGER,
    feedback_usuario TEXT,
    foi_aceita BOOLEAN,
    aceita_em TIMESTAMPTZ,
    aceita_por UUID REFERENCES public.perfis_usuario(id),
    criado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_sugestoes_ia IS 'Sugestões de produtos geradas por IA';

-- -----------------------------------------------------
-- Tabela: edi_analises_ia
-- -----------------------------------------------------
CREATE TABLE public.edi_analises_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID NOT NULL REFERENCES public.edi_cotacoes(id) ON DELETE CASCADE,
    status status_analise_ia DEFAULT 'pendente',
    modelo_ia VARCHAR(100),
    total_itens INTEGER,
    itens_analisados INTEGER DEFAULT 0,
    itens_com_sugestao INTEGER DEFAULT 0,
    tempo_total_segundos INTEGER,
    iniciada_em TIMESTAMPTZ,
    concluida_em TIMESTAMPTZ,
    erro_mensagem TEXT,
    resultado_completo JSONB,
    criado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_analises_ia IS 'Análises de IA das cotações';

-- -----------------------------------------------------
-- Tabela: edi_score_ajustes
-- -----------------------------------------------------
CREATE TABLE public.edi_score_ajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sugestao_ia_id UUID NOT NULL REFERENCES public.edi_sugestoes_ia(id) ON DELETE CASCADE,
    score_original NUMERIC(5,2) NOT NULL,
    score_ajustado NUMERIC(5,2) NOT NULL,
    motivo_ajuste TEXT NOT NULL,
    ajustado_por UUID NOT NULL REFERENCES public.perfis_usuario(id),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_score_ajustes IS 'Ajustes manuais nos scores de confiança da IA';

-- -----------------------------------------------------
-- Tabela: edi_condicoes_pagamento
-- -----------------------------------------------------
CREATE TABLE public.edi_condicoes_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plataforma_id UUID REFERENCES public.edi_plataformas(id),
    codigo_portal VARCHAR(50) NOT NULL,
    descricao_portal TEXT NOT NULL,
    condicao_pagamento_interna_id UUID REFERENCES public.condicoes_pagamento(id),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_condicoes_pagamento IS 'Mapeamento de condições de pagamento EDI';

-- -----------------------------------------------------
-- Tabela: edi_unidades_medida
-- -----------------------------------------------------
CREATE TABLE public.edi_unidades_medida (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plataforma_id UUID REFERENCES public.edi_plataformas(id),
    codigo_portal VARCHAR(50) NOT NULL,
    descricao_portal TEXT NOT NULL,
    abreviacao_portal VARCHAR(20),
    unidade_medida_interna VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_unidades_medida IS 'Mapeamento de unidades de medida EDI';

-- -----------------------------------------------------
-- Tabela: edi_historico_mudancas
-- -----------------------------------------------------
CREATE TABLE public.edi_historico_mudancas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade_tipo VARCHAR(50) NOT NULL,
    entidade_id UUID NOT NULL,
    campo VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    alterado_por UUID REFERENCES public.perfis_usuario(id),
    alterado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edi_historico_mudancas IS 'Histórico de mudanças nas entidades EDI';

-- -----------------------------------------------------
-- Tabela: edi_logs_importacao
-- -----------------------------------------------------
CREATE TABLE public.edi_logs_importacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plataforma_id UUID REFERENCES public.edi_plataformas(id),
    tipo_operacao VARCHAR(50) NOT NULL,
    arquivo_nome VARCHAR(200),
    total_registros INTEGER,
    sucesso INTEGER DEFAULT 0,
    falhas INTEGER DEFAULT 0,
    detalhes_erro JSONB,
    tempo_processamento_ms INTEGER,
    iniciado_por UUID REFERENCES public.perfis_usuario(id),
    iniciado_em TIMESTAMPTZ DEFAULT now(),
    concluido_em TIMESTAMPTZ
);

COMMENT ON TABLE public.edi_logs_importacao IS 'Log de importações EDI';

-- -----------------------------------------------------
-- Tabela: solicitacoes_cadastro
-- -----------------------------------------------------
CREATE TABLE public.solicitacoes_cadastro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_entidade VARCHAR(50) NOT NULL,
    dados_solicitados JSONB NOT NULL,
    status status_solicitacao_cadastro DEFAULT 'pendente',
    observacoes TEXT,
    solicitado_por UUID NOT NULL REFERENCES public.perfis_usuario(id),
    solicitado_em TIMESTAMPTZ DEFAULT now(),
    analisado_por UUID REFERENCES public.perfis_usuario(id),
    analisado_em TIMESTAMPTZ,
    motivo_rejeicao TEXT,
    entidade_criada_id UUID,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.solicitacoes_cadastro IS 'Solicitações de cadastro de entidades';

-- -----------------------------------------------------
-- Tabela: uras
-- -----------------------------------------------------
CREATE TABLE public.uras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    numero_telefone VARCHAR(20),
    mensagem_boas_vindas TEXT,
    mensagem_despedida TEXT,
    mensagem_opcao_invalida TEXT,
    tempo_timeout_segundos INTEGER DEFAULT 30,
    max_tentativas INTEGER DEFAULT 3,
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES public.perfis_usuario(id)
);

COMMENT ON TABLE public.uras IS 'URAs (Unidades de Resposta Audível)';

-- -----------------------------------------------------
-- Tabela: ura_opcoes
-- -----------------------------------------------------
CREATE TABLE public.ura_opcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ura_id UUID NOT NULL REFERENCES public.uras(id) ON DELETE CASCADE,
    opcao_pai_id UUID REFERENCES public.ura_opcoes(id),
    numero_opcao VARCHAR(10) NOT NULL,
    texto_menu TEXT NOT NULL,
    tipo_acao VARCHAR(50),
    destino_transferencia VARCHAR(100),
    mensagem_resposta TEXT,
    ordem INTEGER DEFAULT 0,
    esta_ativa BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.ura_opcoes IS 'Opções de menu das URAs';

-- -----------------------------------------------------
-- Tabela: ura_logs
-- -----------------------------------------------------
CREATE TABLE public.ura_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ura_id UUID REFERENCES public.uras(id),
    numero_origem VARCHAR(20) NOT NULL,
    opcoes_selecionadas TEXT[],
    duracao_segundos INTEGER,
    finalizado_com VARCHAR(50),
    criado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.ura_logs IS 'Log de interações com URAs';

-- =====================================================
-- 4. VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.vw_clientes_completo AS
SELECT 
    c.id,
    c.codigo,
    c.cgc,
    c.nome,
    c.nome_abrev,
    c.endereco,
    c.bairro,
    c.cidade,
    c.estado,
    c.cep,
    c.telefone,
    c.celular,
    c.email,
    c.ativo,
    c.data_cadastro,
    c.user_id,
    p.primeiro_nome || ' ' || COALESCE(p.sobrenome, '') as vendedor_nome,
    COUNT(DISTINCT v.id) as total_vendas,
    COALESCE(SUM(v.valor_final), 0) as valor_total_compras,
    MAX(v.data_venda) as ultima_compra
FROM public.clientes c
LEFT JOIN public.perfis_usuario p ON c.user_id = p.id
LEFT JOIN public.vendas v ON c.id = v.cliente_id AND v.aprovado_em IS NOT NULL
GROUP BY c.id, c.codigo, c.cgc, c.nome, c.nome_abrev, c.endereco, c.bairro, 
         c.cidade, c.estado, c.cep, c.telefone, c.celular, c.email, c.ativo, 
         c.data_cadastro, c.user_id, p.primeiro_nome, p.sobrenome;

CREATE OR REPLACE VIEW public.vw_performance_vendedor AS
SELECT 
    p.id as vendedor_id,
    p.primeiro_nome || ' ' || COALESCE(p.sobrenome, '') as nome_vendedor,
    me.equipe_id,
    e.nome as equipe_nome,
    COALESCE(SUM(mv.meta_valor), 0) as meta_valor,
    COALESCE(SUM(mv.realizado_valor), 0) as realizado_valor,
    CASE 
        WHEN COALESCE(SUM(mv.meta_valor), 0) > 0 
        THEN (COALESCE(SUM(mv.realizado_valor), 0) / SUM(mv.meta_valor)) * 100 
        ELSE 0 
    END as percentual_atingimento,
    COUNT(DISTINCT v.id) as total_vendas,
    COUNT(DISTINCT CASE WHEN v.status = 'ganho' THEN v.id END) as vendas_ganhas,
    COUNT(DISTINCT CASE WHEN v.status = 'perdido' THEN v.id END) as vendas_perdidas,
    COALESCE(SUM(CASE WHEN v.aprovado_em IS NOT NULL THEN v.valor_final ELSE 0 END), 0) as valor_vendido,
    CASE 
        WHEN COUNT(DISTINCT v.id) > 0 
        THEN COALESCE(SUM(CASE WHEN v.aprovado_em IS NOT NULL THEN v.valor_final ELSE 0 END), 0) / COUNT(DISTINCT v.id) 
        ELSE 0 
    END as ticket_medio,
    CASE 
        WHEN COUNT(DISTINCT v.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN v.status = 'ganho' THEN v.id END)::NUMERIC / COUNT(DISTINCT v.id)) * 100 
        ELSE 0 
    END as taxa_conversao,
    AVG(CASE WHEN v.valor_final > 0 THEN ((v.valor_final - v.valor_total) / v.valor_final) * 100 ELSE 0 END) as margem_media,
    AVG(v.probabilidade) as probabilidade_media
FROM public.perfis_usuario p
LEFT JOIN public.membros_equipe me ON p.id = me.usuario_id AND me.esta_ativo = true
LEFT JOIN public.equipes e ON me.equipe_id = e.id
LEFT JOIN public.metas_vendedor mv ON p.id = mv.vendedor_id 
    AND mv.status IN ('ativa', 'andamento', 'concluida')
    AND mv.periodo_inicio <= NOW() 
    AND mv.periodo_fim >= NOW()
LEFT JOIN public.vendas v ON p.id = v.vendedor_id
GROUP BY p.id, p.primeiro_nome, p.sobrenome, me.equipe_id, e.nome;

CREATE OR REPLACE VIEW public.vw_estatisticas_metas_equipe AS
SELECT 
    e.id as equipe_id,
    e.nome as equipe_nome,
    COUNT(me.id) as total_metas,
    COUNT(CASE WHEN me.status = 'ativa' THEN 1 END) as metas_ativas,
    COUNT(CASE WHEN me.status = 'concluida' THEN 1 END) as metas_concluidas,
    COUNT(CASE WHEN me.valor_atual >= me.valor_objetivo THEN 1 END) as metas_atingidas,
    AVG(CASE WHEN me.valor_objetivo > 0 THEN (me.valor_atual / me.valor_objetivo) * 100 ELSE 0 END) as media_conclusao,
    COUNT(CASE WHEN me.periodo_fim < NOW() AND me.status = 'ativa' THEN 1 END) as metas_vencidas
FROM public.equipes e
LEFT JOIN public.metas_equipe me ON e.id = me.equipe_id
WHERE e.esta_ativa = true
GROUP BY e.id, e.nome;

CREATE OR REPLACE VIEW public.vw_analise_ia_dashboard AS
SELECT 
    COUNT(DISTINCT ec.id) as total_cotacoes,
    COUNT(DISTINCT CASE WHEN aia.id IS NOT NULL THEN ec.id END) as total_analisadas,
    COUNT(DISTINCT CASE WHEN aia.status = 'analisando' THEN ec.id END) as em_analise_agora,
    COUNT(DISTINCT CASE WHEN aia.status = 'concluida' THEN ec.id END) as analises_concluidas,
    COUNT(DISTINCT CASE WHEN aia.status = 'erro' THEN ec.id END) as analises_com_erro,
    CASE 
        WHEN COUNT(DISTINCT ec.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN aia.status = 'concluida' THEN ec.id END)::NUMERIC / COUNT(DISTINCT ec.id)) * 100 
        ELSE 0 
    END as taxa_automacao_percent,
    AVG(aia.tempo_total_segundos) as tempo_medio_analise_seg,
    COUNT(DISTINCT eic.id) as total_itens_cotacoes,
    COUNT(DISTINCT CASE WHEN eia.id IS NOT NULL THEN eic.id END) as total_itens_analisados,
    COUNT(DISTINCT eia.id) as total_sugestoes_geradas,
    CASE 
        WHEN COUNT(DISTINCT eic.id) > 0 
        THEN (COUNT(DISTINCT eia.id)::NUMERIC / COUNT(DISTINCT eic.id)) * 100 
        ELSE 0 
    END as taxa_sugestoes_percent,
    COUNT(DISTINCT CASE WHEN aia.concluida_em >= NOW() - INTERVAL '7 days' THEN aia.id END) as analises_ultimos_7_dias,
    COUNT(DISTINCT CASE WHEN aia.concluida_em >= NOW() - INTERVAL '1 day' THEN aia.id END) as analises_ultimas_24h,
    CASE 
        WHEN COUNT(DISTINCT aia.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN aia.status = 'erro' THEN aia.id END)::NUMERIC / COUNT(DISTINCT aia.id)) * 100 
        ELSE 0 
    END as taxa_erro_percent,
    (SELECT aia2.modelo_ia 
     FROM public.edi_analises_ia aia2 
     WHERE aia2.status = 'concluida' 
     GROUP BY aia2.modelo_ia 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as modelo_mais_usado
FROM public.edi_cotacoes ec
LEFT JOIN public.edi_analises_ia aia ON ec.id = aia.cotacao_id
LEFT JOIN public.edi_itens_cotacao eic ON ec.id = eic.cotacao_id
LEFT JOIN public.edi_sugestoes_ia eia ON eic.id = eia.item_cotacao_id;

-- =====================================================
-- 5. FUNÇÕES
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'atualizado_em'
  ) THEN
    NEW.atualizado_em = now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Atualiza automaticamente timestamps de modificação';

CREATE OR REPLACE FUNCTION public.registrar_mudanca_status_atendimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status_atendimento IS DISTINCT FROM NEW.status_atendimento THEN
    INSERT INTO historico_status_atendimento (usuario_id, status_anterior, status_novo)
    VALUES (NEW.id, OLD.status_atendimento, NEW.status_atendimento);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.registrar_mudanca_status_atendimento() IS 'Registra mudanças de status de atendimento';

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 'Verifica se usuário tem um papel específico';

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

COMMENT ON FUNCTION public.has_any_role(uuid, app_role[]) IS 'Verifica se usuário tem algum dos papéis listados';

CREATE OR REPLACE FUNCTION public.get_nivel_hierarquico(_user_id uuid)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MIN(rh.nivel)
  FROM public.user_roles ur
  JOIN public.role_hierarquia rh ON ur.role = rh.role
  WHERE ur.user_id = _user_id;
$$;

COMMENT ON FUNCTION public.get_nivel_hierarquico(uuid) IS 'Retorna o nível hierárquico mais alto do usuário';

CREATE OR REPLACE FUNCTION public.can_access_cliente(_user_id uuid, _cliente_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    has_any_role(_user_id, ARRAY[
      'admin'::app_role,
      'diretor_comercial'::app_role,
      'gerente_comercial'::app_role,
      'coordenador_comercial'::app_role,
      'manager'::app_role
    ])
    OR EXISTS (
      SELECT 1 FROM public.usuario_clientes_vinculo ucv
      WHERE ucv.usuario_id = _user_id 
        AND ucv.cliente_id = _cliente_id 
        AND ucv.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = _cliente_id AND c.user_id = _user_id
    )
  );
$$;

COMMENT ON FUNCTION public.can_access_cliente(uuid, uuid) IS 'Verifica se usuário pode acessar um cliente';

CREATE OR REPLACE FUNCTION public.gerar_numero_ticket()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  mes TEXT;
  contador INTEGER;
  numero TEXT;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YY');
  mes := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket FROM 8) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.tickets
  WHERE numero_ticket LIKE 'TK' || ano || mes || '%';
  
  numero := 'TK' || ano || mes || LPAD(contador::TEXT, 4, '0');
  RETURN numero;
END;
$$;

COMMENT ON FUNCTION public.gerar_numero_ticket() IS 'Gera número sequencial para tickets';

CREATE OR REPLACE FUNCTION public.get_vendas_acessiveis(_user_id uuid)
RETURNS TABLE(venda_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id
  FROM public.vendas v
  WHERE 
    v.user_id = _user_id
    OR v.vendedor_id = _user_id
    OR v.responsavel_id = _user_id
    OR has_any_role(_user_id, ARRAY[
      'admin'::app_role,
      'diretor_comercial'::app_role,
      'gerente_comercial'::app_role,
      'coordenador_comercial'::app_role,
      'manager'::app_role
    ])
    OR (
      has_role(_user_id, 'gestor_equipe'::app_role)
      AND v.equipe_id IN (
        SELECT equipe_id FROM public.get_equipes_gerenciadas(_user_id)
      )
    )
    OR (
      has_role(_user_id, 'backoffice'::app_role)
      AND v.vendedor_id IN (
        SELECT ur.vendedor_vinculado_id 
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id 
          AND ur.vendedor_vinculado_id IS NOT NULL
      )
    );
$$;

COMMENT ON FUNCTION public.get_vendas_acessiveis(uuid) IS 'Retorna vendas acessíveis ao usuário';

CREATE OR REPLACE FUNCTION public.get_equipes_gerenciadas(_user_id uuid)
RETURNS TABLE(equipe_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.equipes e
  WHERE e.esta_ativa = true
    AND (
      e.gestor_id = _user_id 
      OR e.lider_equipe_id = _user_id
      OR public.has_any_role(_user_id, ARRAY[
        'admin'::app_role, 
        'diretor_comercial'::app_role,
        'gerente_comercial'::app_role,
        'coordenador_comercial'::app_role,
        'manager'::app_role
      ])
    );
$$;

COMMENT ON FUNCTION public.get_equipes_gerenciadas(uuid) IS 'Retorna equipes que o usuário gerencia';

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at/atualizado_em
CREATE TRIGGER update_perfis_usuario_updated_at
    BEFORE UPDATE ON public.perfis_usuario
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipes_updated_at
    BEFORE UPDATE ON public.equipes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at
    BEFORE UPDATE ON public.vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar mudanças de status de atendimento
CREATE TRIGGER trigger_registrar_mudanca_status_atendimento
    AFTER UPDATE ON public.perfis_usuario
    FOR EACH ROW
    WHEN (OLD.status_atendimento IS DISTINCT FROM NEW.status_atendimento)
    EXECUTE FUNCTION public.registrar_mudanca_status_atendimento();

-- Trigger para gerar número de ticket
CREATE OR REPLACE FUNCTION public.set_numero_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_ticket IS NULL THEN
    NEW.numero_ticket := gerar_numero_ticket();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_numero_ticket_trigger
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_numero_ticket();

-- Trigger para atualizar última mudança de status
CREATE OR REPLACE FUNCTION public.atualizar_tempo_pausado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duracao INTEGER;
BEGIN
  IF NEW.retomado_em IS NOT NULL AND OLD.retomado_em IS NULL THEN
    duracao := EXTRACT(EPOCH FROM (NEW.retomado_em - NEW.pausado_em)) / 3600;
    NEW.duracao_horas := duracao;
    
    UPDATE public.tickets
    SET 
      tempo_pausado_horas = COALESCE(tempo_pausado_horas, 0) + duracao,
      esta_pausado = false,
      pausado_em = NULL,
      motivo_pausa = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_tempo_pausado
    BEFORE UPDATE ON public.tickets_pausas
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_tempo_pausado();

-- Trigger para atualizar total de interações
CREATE OR REPLACE FUNCTION public.atualizar_total_interacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
  SET total_interacoes = total_interacoes + 1
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_total_interacoes
    AFTER INSERT ON public.tickets_interacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_total_interacoes();

-- Triggers WhatsApp
CREATE OR REPLACE FUNCTION public.atualizar_conversa_ultima_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE whatsapp_conversas
    SET ultima_mensagem_em = NEW.criado_em,
        total_mensagens = total_mensagens + 1,
        total_mensagens_enviadas = CASE WHEN NEW.direcao = 'enviada' 
            THEN total_mensagens_enviadas + 1 ELSE total_mensagens_enviadas END,
        total_mensagens_recebidas = CASE WHEN NEW.direcao = 'recebida' 
            THEN total_mensagens_recebidas + 1 ELSE total_mensagens_recebidas END
    WHERE id = NEW.conversa_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_conversa
    AFTER INSERT ON public.whatsapp_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_conversa_ultima_mensagem();

CREATE OR REPLACE FUNCTION public.verificar_janela_24h()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.direcao = 'recebida' THEN
        UPDATE whatsapp_conversas
        SET janela_24h_ativa = true,
            janela_aberta_em = NEW.criado_em,
            janela_fecha_em = NEW.criado_em + INTERVAL '24 hours'
        WHERE id = NEW.conversa_id;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_verificar_janela
    AFTER INSERT ON public.whatsapp_mensagens
    FOR EACH ROW
    WHEN (NEW.direcao = 'recebida')
    EXECUTE FUNCTION public.verificar_janela_24h();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) - HABILITAÇÃO
-- =====================================================

ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_produtos_vinculo ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. POLÍTICAS RLS - PRODUTOS
-- =====================================================

CREATE POLICY "Usuários autenticados podem ver produtos"
    ON public.produtos FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins e gestores podem gerenciar produtos"
    ON public.produtos FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- =====================================================
-- 9. POLÍTICAS RLS - CLIENTES
-- =====================================================

CREATE POLICY "Usuários podem ver clientes acessíveis"
    ON public.clientes FOR SELECT
    USING (can_access_cliente(auth.uid(), id));

CREATE POLICY "Usuários podem criar clientes"
    ON public.clientes FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar clientes acessíveis"
    ON public.clientes FOR UPDATE
    USING (can_access_cliente(auth.uid(), id))
    WITH CHECK (can_access_cliente(auth.uid(), id));

-- =====================================================
-- 10. POLÍTICAS RLS - VENDAS
-- =====================================================

CREATE POLICY "vendas_select_staff_total"
    ON public.vendas FOR SELECT
    USING (has_any_role(auth.uid(), ARRAY[
        'admin'::app_role,
        'diretor_comercial'::app_role,
        'gerente_comercial'::app_role,
        'coordenador_comercial'::app_role
    ]));

CREATE POLICY "vendas_select_vendedor_escopo"
    ON public.vendas FOR SELECT
    USING (
        has_any_role(auth.uid(), ARRAY[
            'sales'::app_role,
            'representante_comercial'::app_role,
            'executivo_contas'::app_role
        ])
        AND user_id = auth.uid()
        AND can_access_cliente(auth.uid(), cliente_id)
    );

CREATE POLICY "vendas_insert_staff_total"
    ON public.vendas FOR INSERT
    WITH CHECK (
        has_any_role(auth.uid(), ARRAY[
            'admin'::app_role,
            'diretor_comercial'::app_role,
            'gerente_comercial'::app_role,
            'coordenador_comercial'::app_role,
            'manager'::app_role
        ])
        AND can_access_cliente(COALESCE(vendedor_id, responsavel_id), cliente_id)
    );

CREATE POLICY "vendas_insert_vendedor_escopo"
    ON public.vendas FOR INSERT
    WITH CHECK (
        has_any_role(auth.uid(), ARRAY[
            'sales'::app_role,
            'representante_comercial'::app_role,
            'executivo_contas'::app_role
        ])
        AND (
            (responsavel_id = auth.uid() AND can_access_cliente(auth.uid(), cliente_id))
            OR (vendedor_id = auth.uid() AND can_access_cliente(auth.uid(), cliente_id))
        )
    );

CREATE POLICY "vendas_update_staff_total"
    ON public.vendas FOR UPDATE
    USING (has_any_role(auth.uid(), ARRAY[
        'admin'::app_role,
        'diretor_comercial'::app_role,
        'gerente_comercial'::app_role,
        'coordenador_comercial'::app_role
    ]))
    WITH CHECK (has_any_role(auth.uid(), ARRAY[
        'admin'::app_role,
        'diretor_comercial'::app_role,
        'gerente_comercial'::app_role,
        'coordenador_comercial'::app_role
    ]));

CREATE POLICY "vendas_update_vendedor_escopo"
    ON public.vendas FOR UPDATE
    USING (
        has_any_role(auth.uid(), ARRAY[
            'sales'::app_role,
            'representante_comercial'::app_role,
            'executivo_contas'::app_role
        ])
        AND user_id = auth.uid()
        AND can_access_cliente(auth.uid(), cliente_id)
    )
    WITH CHECK (
        has_any_role(auth.uid(), ARRAY[
            'sales'::app_role,
            'representante_comercial'::app_role,
            'executivo_contas'::app_role
        ])
        AND user_id = auth.uid()
        AND can_access_cliente(auth.uid(), cliente_id)
    );

-- =====================================================
-- 11. POLÍTICAS RLS - TICKETS
-- =====================================================

CREATE POLICY "Usuários podem ver tickets acessíveis"
    ON public.tickets FOR SELECT
    USING (
        criado_por = auth.uid()
        OR atribuido_para = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'support'::app_role])
    );

CREATE POLICY "Usuários autenticados podem criar tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Responsáveis podem atualizar tickets"
    ON public.tickets FOR UPDATE
    USING (
        criado_por = auth.uid()
        OR atribuido_para = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'support'::app_role])
    );

-- =====================================================
-- 12. POLÍTICAS RLS - WHATSAPP
-- =====================================================

CREATE POLICY "Admins e Managers podem gerenciar contas WhatsApp"
    ON public.whatsapp_contas FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Atendentes podem ver conversas atribuídas"
    ON public.whatsapp_conversas FOR SELECT
    USING (
        atribuido_para = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'support'::app_role])
    );

CREATE POLICY "Atendentes podem atualizar conversas atribuídas"
    ON public.whatsapp_conversas FOR UPDATE
    USING (
        atribuido_para = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'support'::app_role])
    );

-- =====================================================
-- 13. POLÍTICAS RLS - EQUIPES E METAS
-- =====================================================

CREATE POLICY "Membros podem ver suas equipes"
    ON public.equipes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.membros_equipe me
            WHERE me.equipe_id = id
              AND me.usuario_id = auth.uid()
              AND me.esta_ativo = true
        )
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
    );

CREATE POLICY "Líderes e admins podem criar metas"
    ON public.metas_equipe FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.equipes e
            WHERE e.id = equipe_id
              AND (e.lider_equipe_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
        )
    );

CREATE POLICY "Líderes e admins podem atualizar metas"
    ON public.metas_equipe FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.equipes e
            WHERE e.id = equipe_id
              AND (e.lider_equipe_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
        )
    );

CREATE POLICY "Membros podem ver metas de suas equipes"
    ON public.metas_equipe FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.membros_equipe me
            WHERE me.equipe_id = metas_equipe.equipe_id
              AND me.usuario_id = auth.uid()
              AND me.esta_ativo = true
        )
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
    );

-- =====================================================
-- 14. POLÍTICAS RLS - EDI
-- =====================================================

CREATE POLICY "Usuários podem gerenciar vínculos EDI"
    ON public.edi_produtos_vinculo FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Usuários podem visualizar cotações EDI"
    ON public.edi_cotacoes FOR SELECT
    USING (
        responsavel_id = auth.uid()
        OR criado_por = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
    );

CREATE POLICY "Usuários podem criar cotações EDI"
    ON public.edi_cotacoes FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Usuários podem atualizar cotações EDI"
    ON public.edi_cotacoes FOR UPDATE
    USING (
        responsavel_id = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
    );

-- =====================================================
-- 15. POLÍTICAS RLS - PERFIS E ROLES
-- =====================================================

CREATE POLICY "Usuários podem ver seu próprio perfil"
    ON public.perfis_usuario FOR SELECT
    USING (id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.perfis_usuario FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins podem gerenciar perfis"
    ON public.perfis_usuario FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem ver seus próprios roles"
    ON public.user_roles FOR SELECT
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem gerenciar roles"
    ON public.user_roles FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 16. POLÍTICAS RLS - OPORTUNIDADES
-- =====================================================

CREATE POLICY "Usuários comerciais podem criar oportunidades"
    ON public.oportunidades FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY[
        'admin'::app_role,
        'diretor_comercial'::app_role,
        'gerente_comercial'::app_role,
        'coordenador_comercial'::app_role,
        'manager'::app_role,
        'gestor_equipe'::app_role,
        'representante_comercial'::app_role,
        'executivo_contas'::app_role,
        'sales'::app_role
    ]));

CREATE POLICY "Usuários podem visualizar oportunidades acessíveis"
    ON public.oportunidades FOR SELECT
    USING (
        get_nivel_hierarquico(auth.uid()) <= 3
        OR (
            has_role(auth.uid(), 'gestor_equipe'::app_role)
            AND equipe_id IN (SELECT equipe_id FROM get_equipes_gerenciadas(auth.uid()))
        )
        OR vendedor_id = auth.uid()
        OR proprietario_id = auth.uid()
        OR (
            has_role(auth.uid(), 'backoffice'::app_role)
            AND vendedor_id IN (
                SELECT ur.vendedor_vinculado_id 
                FROM user_roles ur
                WHERE ur.user_id = auth.uid() 
                  AND ur.vendedor_vinculado_id IS NOT NULL
            )
        )
    );

CREATE POLICY "Usuários podem atualizar oportunidades acessíveis"
    ON public.oportunidades FOR UPDATE
    USING (
        get_nivel_hierarquico(auth.uid()) <= 3
        OR (
            has_role(auth.uid(), 'gestor_equipe'::app_role)
            AND equipe_id IN (SELECT equipe_id FROM get_equipes_gerenciadas(auth.uid()))
        )
        OR vendedor_id = auth.uid()
        OR proprietario_id = auth.uid()
    )
    WITH CHECK (
        get_nivel_hierarquico(auth.uid()) <= 3
        OR (
            has_role(auth.uid(), 'gestor_equipe'::app_role)
            AND equipe_id IN (SELECT equipe_id FROM get_equipes_gerenciadas(auth.uid()))
        )
        OR vendedor_id = auth.uid()
        OR proprietario_id = auth.uid()
    );

-- =====================================================
-- 17. ÍNDICES PRINCIPAIS
-- =====================================================

-- Índices de Performance
CREATE INDEX idx_vendas_user_id ON public.vendas(user_id);
CREATE INDEX idx_vendas_cliente_id ON public.vendas(cliente_id);
CREATE INDEX idx_vendas_vendedor_id ON public.vendas(vendedor_id);
CREATE INDEX idx_vendas_equipe_id ON public.vendas(equipe_id);
CREATE INDEX idx_vendas_data_venda ON public.vendas(data_venda);
CREATE INDEX idx_vendas_status ON public.vendas(status);
CREATE INDEX idx_vendas_aprovado_em ON public.vendas(aprovado_em) WHERE aprovado_em IS NOT NULL;

CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_clientes_cgc ON public.clientes(cgc);
CREATE INDEX idx_clientes_nome ON public.clientes USING gin(nome gin_trgm_ops);
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);

CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX idx_produtos_nome ON public.produtos USING gin(nome gin_trgm_ops);
CREATE INDEX idx_produtos_ativo ON public.produtos(ativo);

CREATE INDEX idx_tickets_criado_por ON public.tickets(criado_por);
CREATE INDEX idx_tickets_atribuido_para ON public.tickets(atribuido_para);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_prioridade ON public.tickets(prioridade);
CREATE INDEX idx_tickets_data_abertura ON public.tickets(data_abertura);

CREATE INDEX idx_whatsapp_mensagens_conversa_id ON public.whatsapp_mensagens(conversa_id);
CREATE INDEX idx_whatsapp_mensagens_criado_em ON public.whatsapp_mensagens(criado_em);
CREATE INDEX idx_whatsapp_conversas_conta_id ON public.whatsapp_conversas(whatsapp_conta_id);
CREATE INDEX idx_whatsapp_conversas_atribuido_para ON public.whatsapp_conversas(atribuido_para);
CREATE INDEX idx_whatsapp_conversas_status ON public.whatsapp_conversas(status);

CREATE INDEX idx_edi_cotacoes_plataforma_id ON public.edi_cotacoes(plataforma_id);
CREATE INDEX idx_edi_cotacoes_step_atual ON public.edi_cotacoes(step_atual);
CREATE INDEX idx_edi_cotacoes_cnpj_cliente ON public.edi_cotacoes(cnpj_cliente);
CREATE INDEX idx_edi_itens_cotacao_cotacao_id ON public.edi_itens_cotacao(cotacao_id);
CREATE INDEX idx_edi_produtos_vinculo_produto_id ON public.edi_produtos_vinculo(produto_id);
CREATE INDEX idx_edi_produtos_vinculo_cnpj_cliente ON public.edi_produtos_vinculo(cnpj_cliente);

CREATE INDEX idx_membros_equipe_usuario_id ON public.membros_equipe(usuario_id);
CREATE INDEX idx_membros_equipe_equipe_id ON public.membros_equipe(equipe_id);
CREATE INDEX idx_metas_equipe_equipe_id ON public.metas_equipe(equipe_id);
CREATE INDEX idx_metas_vendedor_vendedor_id ON public.metas_vendedor(vendedor_id);

-- =====================================================
-- 18. DADOS SEED
-- =====================================================

-- Condições de Pagamento
INSERT INTO public.condicoes_pagamento (nome, descricao, parcelas, dias_primeira_parcela, dias_entre_parcelas) VALUES
('À Vista', 'Pagamento à vista', 1, 0, 0),
('30 dias', 'Pagamento em 30 dias', 1, 30, 0),
('2x sem juros', 'Parcelado em 2x sem juros', 2, 30, 30),
('3x sem juros', 'Parcelado em 3x sem juros', 3, 30, 30),
('30/60 dias', 'Parcelado 30 e 60 dias', 2, 30, 30),
('30/60/90 dias', 'Parcelado 30, 60 e 90 dias', 3, 30, 30)
ON CONFLICT DO NOTHING;

-- Tipos de Frete
INSERT INTO public.tipos_frete (nome, descricao) VALUES
('CIF', 'Custo, Seguro e Frete - vendedor responsável'),
('FOB', 'Free On Board - comprador responsável'),
('Por conta do cliente', 'Cliente contrata o frete'),
('Entrega local', 'Entrega por conta própria'),
('Retira no local', 'Cliente retira no estabelecimento')
ON CONFLICT DO NOTHING;

-- Tipos de Pedido
INSERT INTO public.tipos_pedido (nome, descricao) VALUES
('Venda', 'Pedido de venda normal'),
('Orçamento', 'Orçamento sem compromisso'),
('Bonificação', 'Produto bonificado'),
('Demonstração', 'Produto para demonstração'),
('Devolução', 'Devolução de mercadoria')
ON CONFLICT DO NOTHING;

-- Hierarquia de Roles
INSERT INTO public.role_hierarquia (role, nivel, pode_gerenciar_roles) VALUES
('admin', 1, ARRAY['admin', 'manager', 'sales', 'warehouse', 'support', 'diretor_comercial', 'gerente_comercial', 'coordenador_comercial', 'gestor_equipe', 'lider', 'representante_comercial', 'executivo_contas', 'backoffice']::app_role[]),
('diretor_comercial', 2, ARRAY['gerente_comercial', 'coordenador_comercial', 'gestor_equipe', 'lider', 'representante_comercial', 'executivo_contas', 'sales', 'backoffice']::app_role[]),
('gerente_comercial', 3, ARRAY['coordenador_comercial', 'gestor_equipe', 'lider', 'representante_comercial', 'executivo_contas', 'sales', 'backoffice']::app_role[]),
('coordenador_comercial', 4, ARRAY['gestor_equipe', 'lider', 'representante_comercial', 'executivo_contas', 'sales', 'backoffice']::app_role[]),
('gestor_equipe', 5, ARRAY['lider', 'representante_comercial', 'executivo_contas', 'sales', 'backoffice']::app_role[]),
('lider', 6, ARRAY['representante_comercial', 'executivo_contas', 'sales', 'backoffice']::app_role[]),
('manager', 2, ARRAY['manager', 'sales', 'warehouse', 'support', 'backoffice']::app_role[]),
('representante_comercial', 7, ARRAY[]::app_role[]),
('executivo_contas', 7, ARRAY[]::app_role[]),
('sales', 8, ARRAY[]::app_role[]),
('backoffice', 9, ARRAY[]::app_role[]),
('warehouse', 8, ARRAY[]::app_role[]),
('support', 8, ARRAY[]::app_role[])
ON CONFLICT (role) DO NOTHING;

-- Filas de Atendimento
INSERT INTO public.filas_atendimento (nome, descricao, cor, ordem) VALUES
('Geral', 'Fila geral de atendimento', '#3B82F6', 1),
('Suporte Técnico', 'Questões técnicas', '#8B5CF6', 2),
('Vendas', 'Dúvidas sobre vendas', '#10B981', 3),
('Financeiro', 'Questões financeiras', '#F59E0B', 4),
('Urgente', 'Casos urgentes', '#EF4444', 5)
ON CONFLICT DO NOTHING;

-- Pipelines
INSERT INTO public.pipelines (nome, descricao, tipo, ordem) VALUES
('Pipeline de Vendas', 'Pipeline padrão de vendas', 'vendas', 1),
('Pipeline de Cotações EDI', 'Pipeline para cotações via EDI', 'edi', 2)
ON CONFLICT DO NOTHING;

-- Estágios Pipeline (exemplo para o pipeline de vendas)
INSERT INTO public.estagios_pipeline (pipeline_id, nome, ordem, probabilidade, rotacao_dias, cor, eh_final)
SELECT p.id, 'Prospecção', 1, 10, 7, '#6B7280', false
FROM public.pipelines p WHERE p.tipo = 'vendas'
ON CONFLICT DO NOTHING;

INSERT INTO public.estagios_pipeline (pipeline_id, nome, ordem, probabilidade, rotacao_dias, cor, eh_final)
SELECT p.id, 'Qualificação', 2, 25, 5, '#3B82F6', false
FROM public.pipelines p WHERE p.tipo = 'vendas'
ON CONFLICT DO NOTHING;

INSERT INTO public.estagios_pipeline (pipeline_id, nome, ordem, probabilidade, rotacao_dias, cor, eh_final)
SELECT p.id, 'Proposta', 3, 50, 7, '#8B5CF6', false
FROM public.pipelines p WHERE p.tipo = 'vendas'
ON CONFLICT DO NOTHING;

INSERT INTO public.estagios_pipeline (pipeline_id, nome, ordem, probabilidade, rotacao_dias, cor, eh_final)
SELECT p.id, 'Negociação', 4, 75, 5, '#F59E0B', false
FROM public.pipelines p WHERE p.tipo = 'vendas'
ON CONFLICT DO NOTHING;

INSERT INTO public.estagios_pipeline (pipeline_id, nome, ordem, probabilidade, rotacao_dias, cor, eh_final)
SELECT p.id, 'Ganho', 5, 100, 0, '#10B981', true
FROM public.pipelines p WHERE p.tipo = 'vendas'
ON CONFLICT DO NOTHING;

INSERT INTO public.estagios_pipeline (pipeline_id, nome, ordem, probabilidade, rotacao_dias, cor, eh_final)
SELECT p.id, 'Perdido', 6, 0, 0, '#EF4444', true
FROM public.pipelines p WHERE p.tipo = 'vendas'
ON CONFLICT DO NOTHING;

-- Configurações Sistema
INSERT INTO public.configuracoes_sistema (chave, valor) VALUES
('whatsapp_global_config', '{"provider": "gupshup", "auto_confirm": true}'::jsonb),
('sistema_config', '{"nome": "Sistema de Gestão Comercial", "versao": "1.0.0"}'::jsonb)
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- =====================================================
-- 19. COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON DATABASE postgres IS 'Sistema de Gestão Comercial - Banco de Dados Principal';

-- =====================================================
-- FIM DO DUMP
-- =====================================================
-- 
-- Para restaurar este dump:
-- 1. Crie um novo banco de dados PostgreSQL
-- 2. Execute: psql -U seu_usuario -d seu_banco -f database-dump.sql
-- 3. Configure as variáveis de ambiente com as credenciais
-- 4. Verifique as políticas RLS estão ativas
-- 
-- ATENÇÃO:
-- - Este dump NÃO inclui dados de usuários (auth.users)
-- - Dados sensíveis devem ser importados separadamente
-- - Ajuste as permissões conforme necessário
-- - Teste em ambiente de desenvolvimento primeiro
-- =====================================================