-- ==============================================================================
-- COMPLETE DATABASE SCHEMA DUMP
-- Sistema de Gestão Comercial - CRM B2B
-- Generated: 2024-12-13
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: ENUMS (Custom Types)
-- ==============================================================================

-- Application Roles
CREATE TYPE public.app_role AS ENUM (
  'admin', 'manager', 'sales', 'warehouse', 'support', 'lider', 'backoffice',
  'diretor_comercial', 'gerente_comercial', 'coordenador_comercial', 'gestor_equipe',
  'representante_comercial', 'executivo_contas', 'consultor_vendas'
);

-- Pipeline Stages
CREATE TYPE public.etapa_pipeline AS ENUM (
  'prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido', 'followup_cliente'
);

-- Identification Type
CREATE TYPE public.identificacao_tipo AS ENUM ('Cliente', 'Fornecedor', 'Ambos');

-- Binding Method
CREATE TYPE public.metodo_vinculacao AS ENUM ('ia_automatico', 'ia_manual', 'manual', 'importado');

-- Nature Type
CREATE TYPE public.natureza_tipo AS ENUM ('Juridica', 'Fisica');

-- Activity Priority
CREATE TYPE public.prioridade_atividade AS ENUM ('critica', 'alta', 'media', 'baixa');

-- Ticket Priority
CREATE TYPE public.prioridade_ticket AS ENUM ('baixa', 'normal', 'alta', 'urgente');

-- Sentiment Type
CREATE TYPE public.sentimento_tipo AS ENUM ('muito_positivo', 'positivo', 'neutro', 'negativo', 'muito_negativo');

-- AI Analysis Status
CREATE TYPE public.status_analise_ia AS ENUM ('pendente', 'em_analise', 'concluida', 'erro', 'cancelada');

-- Approval Status
CREATE TYPE public.status_aprovacao AS ENUM ('pendente', 'aprovada', 'rejeitada', 'expirada');

-- Activity Status
CREATE TYPE public.status_atividade AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada', 'reagendada', 'aguardando_resposta');

-- Delivery Status
CREATE TYPE public.status_entrega AS ENUM ('pendente', 'em_transito', 'entregue', 'devolvido', 'cancelado');

-- Invoice Status
CREATE TYPE public.status_nota_fiscal AS ENUM ('emitida', 'cancelada', 'denegada', 'inutilizada');

-- Proposal Status
CREATE TYPE public.status_proposta AS ENUM ('rascunho', 'enviada', 'aceita', 'rejeitada', 'negociacao', 'aprovacao_pendente', 'aprovada_diretoria', 'rejeitada_diretoria');

-- Registration Request Status
CREATE TYPE public.status_solicitacao_cadastro AS ENUM ('rascunho', 'em_analise', 'aprovado', 'rejeitado');

-- Ticket Status
CREATE TYPE public.status_ticket AS ENUM ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado', 'cancelado');

-- Activity Type
CREATE TYPE public.tipo_atividade AS ENUM ('tarefa', 'chamada', 'reuniao', 'email', 'whatsapp', 'visita', 'follow_up', 'proposta', 'negociacao', 'outro');

-- Address Type
CREATE TYPE public.tipo_endereco AS ENUM ('principal', 'entrega', 'cobranca');

-- Feedback Type
CREATE TYPE public.tipo_feedback AS ENUM ('positivo', 'negativo', 'neutro');

-- Ticket Type
CREATE TYPE public.tipo_ticket AS ENUM ('reclamacao', 'duvida', 'sugestao', 'elogio', 'garantia', 'troca', 'devolucao');

-- What Type (Polymorphic)
CREATE TYPE public.what_tipo AS ENUM ('venda', 'oportunidade', 'conta', 'ticket', 'proposta');

-- Who Type (Polymorphic)
CREATE TYPE public.who_tipo AS ENUM ('lead', 'contato', 'cliente');

-- Yes/No Type
CREATE TYPE public.yes_no AS ENUM ('YES', 'NO');


-- ==============================================================================
-- SECTION 2: TABLES (122 Tables)
-- ==============================================================================

-- 2.1 Core System Tables
-- ----------------------

-- System Configurations
CREATE TABLE public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- User Profiles
CREATE TABLE public.perfis_usuario (
  id UUID PRIMARY KEY,
  primeiro_nome VARCHAR(100),
  sobrenome VARCHAR(100),
  nome_completo TEXT GENERATED ALWAYS AS (primeiro_nome || ' ' || sobrenome) STORED,
  email TEXT,
  telefone VARCHAR(20),
  avatar_url TEXT,
  cargo VARCHAR(100),
  departamento VARCHAR(100),
  esta_ativo BOOLEAN DEFAULT true,
  esta_disponivel BOOLEAN DEFAULT true,
  status_atendimento VARCHAR(20) DEFAULT 'offline',
  max_conversas_simultaneas INTEGER DEFAULT 5,
  horario_trabalho_inicio TIME,
  horario_trabalho_fim TIME,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  vendedor_vinculado_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Role Hierarchy
CREATE TABLE public.role_hierarquia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL UNIQUE,
  nivel INTEGER NOT NULL,
  pode_acessar_menu_tecnico BOOLEAN DEFAULT false,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Teams & Goals
-- -----------------

-- Teams
CREATE TABLE public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_equipe VARCHAR(50),
  lider_equipe_id UUID,
  gestor_id UUID,
  esta_ativa BOOLEAN DEFAULT true,
  excluido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Team Members
CREATE TABLE public.membros_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL REFERENCES public.equipes(id),
  usuario_id UUID NOT NULL,
  papel VARCHAR(50),
  carga_trabalho INTEGER DEFAULT 100,
  esta_ativo BOOLEAN DEFAULT true,
  entrou_em TIMESTAMPTZ DEFAULT now(),
  saiu_em TIMESTAMPTZ,
  motivo_saida TEXT,
  UNIQUE(equipe_id, usuario_id)
);

-- Team Goals
CREATE TABLE public.metas_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL REFERENCES public.equipes(id),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo_meta VARCHAR(50) NOT NULL,
  metrica VARCHAR(50),
  valor_objetivo NUMERIC(15,2) NOT NULL,
  valor_atual NUMERIC(15,2) DEFAULT 0,
  unidade_medida VARCHAR(20),
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'ativa',
  prioridade VARCHAR(20) DEFAULT 'media',
  alerta_percentual NUMERIC(5,2) DEFAULT 80,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT
);

-- Seller Goals
CREATE TABLE public.metas_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL,
  equipe_id UUID,
  meta_valor NUMERIC(15,2) NOT NULL,
  valor_atual NUMERIC(15,2) DEFAULT 0,
  meta_unidades INTEGER,
  unidades_atual INTEGER DEFAULT 0,
  meta_margem NUMERIC(5,2),
  margem_atual NUMERIC(5,2),
  meta_conversao NUMERIC(5,2),
  conversao_atual NUMERIC(5,2),
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'ativa',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2.3 Clients & Contacts
-- ----------------------

-- Accounts
CREATE TABLE public.contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_conta VARCHAR(200) NOT NULL,
  cnpj VARCHAR(20),
  tipo_conta VARCHAR(50),
  setor VARCHAR(100),
  receita_anual NUMERIC(15,2),
  numero_funcionarios INTEGER,
  site TEXT,
  classificacao VARCHAR(50),
  estagio_ciclo_vida VARCHAR(50),
  origem_lead VARCHAR(100),
  proprietario_id UUID,
  conta_pai_id UUID REFERENCES public.contas(id),
  endereco_cobranca_id UUID,
  endereco_entrega_id UUID,
  descricao TEXT,
  esta_ativa BOOLEAN DEFAULT true,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_por UUID,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  excluido_em TIMESTAMPTZ
);

-- Clients
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vendedor_id UUID,
  equipe_id UUID REFERENCES public.equipes(id),
  conta_id UUID REFERENCES public.contas(id),
  nome_emit VARCHAR(200),
  nome_fantasia VARCHAR(200),
  nome_abrev VARCHAR(100),
  cgc VARCHAR(20),
  ins_estadual VARCHAR(30),
  identific public.identificacao_tipo DEFAULT 'Cliente',
  natureza public.natureza_tipo DEFAULT 'Juridica',
  atividade TEXT,
  cnae_principal VARCHAR(20),
  cnae_descricao TEXT,
  natureza_juridica VARCHAR(100),
  porte VARCHAR(50),
  capital_social NUMERIC(15,2),
  data_abertura DATE,
  optante_simples BOOLEAN,
  data_opcao_simples DATE,
  optante_mei BOOLEAN,
  regime_tributario VARCHAR(50),
  situacao_cadastral VARCHAR(50),
  telefone1 VARCHAR(20),
  e_mail VARCHAR(200),
  email_financeiro VARCHAR(200),
  email_xml VARCHAR(200),
  cod_emitente INTEGER,
  cod_rep INTEGER,
  cod_gr_cli INTEGER,
  cod_cond_pag INTEGER,
  cod_suframa VARCHAR(20),
  inscricao_suframa VARCHAR(30),
  situacao_suframa VARCHAR(50),
  lim_credito NUMERIC(15,2),
  limite_disponivel NUMERIC(15,2),
  ind_cre_cli VARCHAR(10),
  nat_operacao VARCHAR(100),
  cond_pag_fixa public.yes_no,
  coligada VARCHAR(50),
  equipevendas VARCHAR(100),
  observacoes TEXT,
  eh_matriz BOOLEAN DEFAULT true,
  dados_cnpja JSONB,
  metadados_consulta JSONB,
  ultima_consulta_cnpja TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Client Addresses
CREATE TABLE public.cliente_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  tipo VARCHAR(50) NOT NULL,
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  pais VARCHAR(50) DEFAULT 'Brasil',
  codigo_ibge VARCHAR(10),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  validado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contacts
CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  conta_id UUID REFERENCES public.contas(id),
  primeiro_nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  nome_completo TEXT,
  email VARCHAR(200),
  email_secundario VARCHAR(200),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  whatsapp_numero VARCHAR(20),
  cargo VARCHAR(100),
  departamento VARCHAR(100),
  tratamento VARCHAR(20),
  nivel_autoridade VARCHAR(50),
  status_lead VARCHAR(50),
  pontuacao_lead INTEGER DEFAULT 0,
  score_qualificacao INTEGER,
  origem_lead VARCHAR(100),
  esta_ativo BOOLEAN DEFAULT true,
  aceita_marketing BOOLEAN DEFAULT true,
  nao_enviar_email BOOLEAN DEFAULT false,
  nao_ligar BOOLEAN DEFAULT false,
  consentimento_lgpd BOOLEAN,
  data_consentimento_lgpd TIMESTAMPTZ,
  preferencia_contato VARCHAR(50),
  melhor_horario_contato VARCHAR(50),
  frequencia_contato_preferida VARCHAR(50),
  idioma_preferido VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  interesses TEXT[],
  tags TEXT[],
  linkedin_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  skype_id VARCHAR(100),
  data_nascimento DATE,
  ultimo_contato TIMESTAMPTZ,
  proximo_followup TIMESTAMPTZ,
  data_ultima_atividade TIMESTAMPTZ,
  relacionamento_com VARCHAR(100),
  reporta_para_id UUID,
  descricao TEXT,
  dores_identificadas TEXT,
  necessidade_identificada TEXT,
  objetivos_profissionais TEXT,
  budget_estimado NUMERIC(15,2),
  timeline_decisao VARCHAR(100),
  cancelou_inscricao_email BOOLEAN DEFAULT false,
  campanha_origem VARCHAR(100),
  proprietario_id UUID,
  endereco_correspondencia_id UUID,
  estagio_ciclo_vida VARCHAR(50),
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_por UUID,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  excluido_em TIMESTAMPTZ
);

-- Client Branches
CREATE TABLE public.cliente_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_matriz_id UUID REFERENCES public.clientes(id),
  cnpj VARCHAR(20) NOT NULL,
  razao_social VARCHAR(200),
  nome_fantasia VARCHAR(200),
  situacao VARCHAR(50),
  endereco JSONB,
  telefones JSONB,
  emails JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client Partners
CREATE TABLE public.cliente_socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  nome VARCHAR(200) NOT NULL,
  cpf_cnpj VARCHAR(20),
  qualificacao VARCHAR(100),
  percentual_participacao NUMERIC(5,2),
  data_entrada DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client State Registrations
CREATE TABLE public.cliente_inscricoes_estaduais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  uf VARCHAR(2) NOT NULL,
  inscricao_estadual VARCHAR(30),
  situacao VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 Products
-- ------------

-- Products
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_interna VARCHAR(50),
  codigo_barras VARCHAR(50),
  nome TEXT NOT NULL,
  descricao TEXT,
  narrativa TEXT,
  marca VARCHAR(100),
  fabricante VARCHAR(200),
  unidade_medida VARCHAR(10),
  lote_multiplo NUMERIC(10,2) DEFAULT 1,
  ncm VARCHAR(10),
  preco_custo NUMERIC(15,4),
  preco_venda NUMERIC(15,4),
  margem_padrao NUMERIC(5,2),
  quantidade_em_maos NUMERIC(10,2) DEFAULT 0,
  quantidade_reservada NUMERIC(10,2) DEFAULT 0,
  estoque_minimo NUMERIC(10,2),
  estoque_maximo NUMERIC(10,2),
  peso_bruto NUMERIC(10,3),
  peso_liquido NUMERIC(10,3),
  altura NUMERIC(10,3),
  largura NUMERIC(10,3),
  comprimento NUMERIC(10,3),
  volume NUMERIC(10,3),
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),
  familia VARCHAR(100),
  grupo VARCHAR(100),
  marcadores_produto TEXT[],
  esta_ativo BOOLEAN DEFAULT true,
  embedding vector(1536),
  embedding_atualizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Sales & Proposals
-- ---------------------

-- Pipelines
CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  esta_ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Pipeline Stages
CREATE TABLE public.estagios_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  probabilidade INTEGER DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  cor VARCHAR(20),
  esta_ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Opportunities
CREATE TABLE public.oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  conta_id UUID REFERENCES public.contas(id),
  contato_id UUID REFERENCES public.contatos(id),
  cliente_id UUID REFERENCES public.clientes(id),
  proprietario_id UUID,
  vendedor_id UUID,
  pipeline_id UUID REFERENCES public.pipelines(id),
  estagio_id UUID REFERENCES public.estagios_pipeline(id),
  valor_estimado NUMERIC(15,2),
  percentual_probabilidade INTEGER,
  data_fechamento_prevista DATE,
  data_fechamento_real DATE,
  tipo VARCHAR(50),
  origem VARCHAR(100),
  campanha VARCHAR(100),
  motivo_perda TEXT,
  concorrente VARCHAR(200),
  foi_ganha BOOLEAN,
  foi_perdida BOOLEAN,
  proximo_passo TEXT,
  proxima_atividade_em TIMESTAMPTZ,
  observacoes TEXT,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_por UUID,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  excluido_em TIMESTAMPTZ
);

-- Sales
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vendedor_id UUID,
  responsavel_id UUID,
  cliente_id UUID REFERENCES public.clientes(id),
  oportunidade_id UUID REFERENCES public.oportunidades(id),
  equipe_id UUID REFERENCES public.equipes(id),
  numero_venda VARCHAR(50),
  status VARCHAR(50) DEFAULT 'rascunho',
  etapa_pipeline public.etapa_pipeline DEFAULT 'prospeccao',
  probabilidade INTEGER DEFAULT 10,
  tipo_pedido_id UUID,
  tipo_frete_id UUID,
  condicao_pagamento_id UUID,
  endereco_entrega_id UUID,
  valor_estimado NUMERIC(15,2),
  valor_total NUMERIC(15,2) DEFAULT 0,
  valor_final NUMERIC(15,2),
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  frete_valor NUMERIC(15,2) DEFAULT 0,
  impostos_valor NUMERIC(15,2) DEFAULT 0,
  frete_calculado BOOLEAN DEFAULT false,
  transportadora_cod VARCHAR(50),
  transportadora_nome VARCHAR(200),
  prazo_entrega_dias INTEGER,
  data_venda DATE,
  data_entrega_prevista DATE,
  data_previsao_fechamento DATE,
  observacoes TEXT,
  observacoes_internas TEXT,
  dados_integracao JSONB,
  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sale Items
CREATE TABLE public.vendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  sequencia_item INTEGER NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL,
  preco_unitario NUMERIC(15,4) NOT NULL,
  preco_tabela NUMERIC(15,4),
  desconto NUMERIC(5,2) DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL,
  frete_rateado NUMERIC(15,2) DEFAULT 0,
  impostos NUMERIC(15,2) DEFAULT 0,
  margem_percentual NUMERIC(5,2),
  observacoes TEXT,
  dados_integracao JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venda_id, sequencia_item)
);

-- Sale Deliveries
CREATE TABLE public.vendas_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id),
  numero_entrega VARCHAR(50),
  status public.status_entrega DEFAULT 'pendente',
  transportadora VARCHAR(200),
  codigo_rastreio VARCHAR(100),
  data_previsao DATE,
  data_saida TIMESTAMPTZ,
  data_entrega TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sale Invoices
CREATE TABLE public.vendas_notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id),
  numero_nf VARCHAR(50) NOT NULL,
  serie VARCHAR(10),
  chave_acesso VARCHAR(50),
  status public.status_nota_fiscal DEFAULT 'emitida',
  valor_total NUMERIC(15,2),
  data_emissao TIMESTAMPTZ,
  data_autorizacao TIMESTAMPTZ,
  xml_url TEXT,
  pdf_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Conditions
CREATE TABLE public.condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_integracao INTEGER NOT NULL,
  nome VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Freight Types
CREATE TABLE public.tipos_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cod_canal_venda INTEGER,
  api_tipo_frete VARCHAR(20),
  esta_ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order Types
CREATE TABLE public.tipos_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INTEGER NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  esta_ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 Activities Module
-- ---------------------

-- Disposition Codes
CREATE TABLE public.codigos_disposicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_atividade public.tipo_atividade,
  icone VARCHAR(50),
  cor VARCHAR(20),
  marca_como_concluido BOOLEAN DEFAULT false,
  requer_agendamento BOOLEAN DEFAULT false,
  requer_proximo_passo BOOLEAN DEFAULT false,
  dias_follow_up_padrao INTEGER,
  sugestao_nba_padrao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Activities
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_atividade VARCHAR(20) UNIQUE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo public.tipo_atividade DEFAULT 'tarefa',
  status public.status_atividade DEFAULT 'pendente',
  prioridade public.prioridade_atividade DEFAULT 'media',
  who_id UUID,
  who_tipo public.who_tipo,
  what_id UUID,
  what_tipo public.what_tipo,
  cliente_id UUID REFERENCES public.clientes(id),
  contato_id UUID REFERENCES public.contatos(id),
  venda_id UUID REFERENCES public.vendas(id),
  oportunidade_id UUID REFERENCES public.oportunidades(id),
  ticket_id UUID,
  responsavel_id UUID,
  criado_por UUID,
  equipe_id UUID REFERENCES public.equipes(id),
  codigo_disposicao_id UUID REFERENCES public.codigos_disposicao(id),
  data_vencimento TIMESTAMPTZ,
  data_inicio TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  duracao_estimada_minutos INTEGER,
  duracao_real_minutos INTEGER,
  concluida_no_prazo BOOLEAN,
  resultado_descricao TEXT,
  proximo_passo TEXT,
  proximo_passo_obrigatorio BOOLEAN DEFAULT false,
  proxima_atividade_id UUID,
  atividade_pai_id UUID,
  eh_recorrente BOOLEAN DEFAULT false,
  regra_recorrencia JSONB,
  lembrete_em TIMESTAMPTZ,
  lembrete_enviado BOOLEAN DEFAULT false,
  tags TEXT[],
  campos_customizados JSONB,
  -- AI Scores
  score_prioridade NUMERIC(10,2),
  score_lead_fit NUMERIC(10,2),
  score_engajamento NUMERIC(10,2),
  score_decaimento_temporal NUMERIC(10,2),
  score_urgencia NUMERIC(10,2),
  score_valor_potencial NUMERIC(10,2),
  score_calculado_em TIMESTAMPTZ,
  -- Sentiment
  sentimento_tipo public.sentimento_tipo,
  sentimento_score NUMERIC(5,2),
  sentimento_analise_em TIMESTAMPTZ,
  -- NBA
  nba_sugestao_tipo VARCHAR(50),
  nba_sugestao_descricao TEXT,
  nba_confianca NUMERIC(5,2),
  nba_aceita BOOLEAN,
  nba_motivo_rejeicao TEXT,
  -- External References
  email_message_id TEXT,
  whatsapp_mensagem_id TEXT,
  chamada_id UUID,
  reuniao_externa_id TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  excluido_em TIMESTAMPTZ
);

-- Activity Comments
CREATE TABLE public.atividades_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id),
  autor_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  anexos JSONB,
  mencoes TEXT[],
  editado BOOLEAN DEFAULT false,
  editado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  excluido_em TIMESTAMPTZ
);

-- Activity Participants
CREATE TABLE public.atividades_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id),
  usuario_id UUID NOT NULL,
  papel VARCHAR(50),
  confirmado BOOLEAN,
  confirmado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(atividade_id, usuario_id)
);

-- Activity History
CREATE TABLE public.atividades_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id),
  campo_alterado VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  alterado_por UUID,
  alterado_em TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- NBA Rules
CREATE TABLE public.nba_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo_atividade_gatilho public.tipo_atividade,
  codigo_disposicao_gatilho_id UUID REFERENCES public.codigos_disposicao(id),
  tipo_atividade_sugerida public.tipo_atividade NOT NULL,
  dias_ate_sugestao INTEGER DEFAULT 0,
  confianca_minima NUMERIC(5,2) DEFAULT 0.5,
  prioridade_sugerida public.prioridade_atividade DEFAULT 'media',
  duracao_sugerida_minutos INTEGER,
  titulo_padrao TEXT,
  descricao_padrao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2.7 Tickets / Support
-- ---------------------

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ticket VARCHAR(20) UNIQUE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo public.tipo_ticket DEFAULT 'duvida',
  status public.status_ticket DEFAULT 'aberto',
  prioridade public.prioridade_ticket DEFAULT 'normal',
  cliente_id UUID REFERENCES public.clientes(id),
  contato_id UUID REFERENCES public.contatos(id),
  criado_por UUID,
  atribuido_para UUID,
  data_abertura TIMESTAMPTZ DEFAULT now(),
  resolvido_em TIMESTAMPTZ,
  fechado_em TIMESTAMPTZ,
  tempo_pausado_horas INTEGER DEFAULT 0,
  esta_pausado BOOLEAN DEFAULT false,
  pausado_em TIMESTAMPTZ,
  motivo_pausa TEXT,
  total_interacoes INTEGER DEFAULT 0,
  avaliacao_nota INTEGER,
  avaliacao_comentario TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Interactions
CREATE TABLE public.tickets_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id),
  tipo_interacao VARCHAR(50) NOT NULL,
  conteudo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  mensagem_interna BOOLEAN DEFAULT false,
  anexos JSONB,
  criado_por UUID,
  nome_autor TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Pauses
CREATE TABLE public.tickets_pausas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id),
  motivo VARCHAR(100),
  pausado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  retomado_em TIMESTAMPTZ,
  duracao_horas INTEGER,
  pausado_por UUID
);

-- 2.8 WhatsApp Integration
-- ------------------------

-- WhatsApp Accounts
CREATE TABLE public.whatsapp_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  provider VARCHAR(50) DEFAULT 'w-api',
  api_url TEXT,
  api_key TEXT,
  instance_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'desconectado',
  qrcode_base64 TEXT,
  esta_ativo BOOLEAN DEFAULT true,
  agente_vendas_ativo BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Contacts
CREATE TABLE public.whatsapp_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_conta_id UUID REFERENCES public.whatsapp_contas(id),
  contato_id UUID REFERENCES public.contatos(id),
  cliente_id UUID REFERENCES public.clientes(id),
  numero VARCHAR(20) NOT NULL,
  nome VARCHAR(200),
  avatar_url TEXT,
  total_mensagens_enviadas INTEGER DEFAULT 0,
  total_mensagens_recebidas INTEGER DEFAULT 0,
  ultima_mensagem_em TIMESTAMPTZ,
  ultima_mensagem_enviada_em TIMESTAMPTZ,
  ultima_mensagem_recebida_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Conversations
CREATE TABLE public.whatsapp_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_conta_id UUID REFERENCES public.whatsapp_contas(id),
  whatsapp_contato_id UUID REFERENCES public.whatsapp_contatos(id),
  cliente_id UUID REFERENCES public.clientes(id),
  contato_id UUID REFERENCES public.contatos(id),
  status VARCHAR(30) DEFAULT 'aberta',
  estagio_agente VARCHAR(50),
  produtos_carrinho JSONB,
  proposta_ativa_id UUID,
  ultima_intencao_detectada VARCHAR(50),
  atribuida_para_id UUID,
  atribuida_em TIMESTAMPTZ,
  atribuicao_automatica BOOLEAN DEFAULT false,
  total_mensagens INTEGER DEFAULT 0,
  total_mensagens_enviadas INTEGER DEFAULT 0,
  total_mensagens_recebidas INTEGER DEFAULT 0,
  ultima_mensagem_em TIMESTAMPTZ,
  janela_24h_ativa BOOLEAN DEFAULT false,
  janela_aberta_em TIMESTAMPTZ,
  janela_fecha_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  finalizado_em TIMESTAMPTZ
);

-- WhatsApp Messages
CREATE TABLE public.whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES public.whatsapp_conversas(id),
  whatsapp_conta_id UUID REFERENCES public.whatsapp_contas(id),
  whatsapp_contato_id UUID REFERENCES public.whatsapp_contatos(id),
  message_id_externo VARCHAR(100),
  direcao VARCHAR(20) NOT NULL,
  tipo VARCHAR(30) DEFAULT 'text',
  conteudo TEXT,
  midia_url TEXT,
  midia_tipo VARCHAR(50),
  midia_nome VARCHAR(200),
  midia_base64 TEXT,
  transcricao_audio TEXT,
  status VARCHAR(20) DEFAULT 'enviada',
  lida BOOLEAN DEFAULT false,
  lida_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  erro TEXT,
  metadata JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Commercial Proposals
CREATE TABLE public.whatsapp_propostas_comerciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES public.whatsapp_conversas(id),
  cliente_id UUID REFERENCES public.clientes(id),
  venda_id UUID REFERENCES public.vendas(id),
  numero_proposta VARCHAR(30) UNIQUE,
  status public.status_proposta DEFAULT 'rascunho',
  subtotal NUMERIC(15,2) DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  frete NUMERIC(15,2) DEFAULT 0,
  impostos_percentual NUMERIC(5,2) DEFAULT 0,
  impostos_valor NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  validade_dias INTEGER DEFAULT 7,
  observacoes TEXT,
  aprovada_diretoria BOOLEAN,
  aprovada_por UUID,
  aprovada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Proposal Items
CREATE TABLE public.whatsapp_propostas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES public.whatsapp_propostas_comerciais(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  quantidade NUMERIC(10,2) NOT NULL,
  preco_unitario NUMERIC(15,4) NOT NULL,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  subtotal NUMERIC(15,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Director Approvals
CREATE TABLE public.whatsapp_aprovacoes_diretoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES public.whatsapp_propostas_comerciais(id),
  solicitado_por UUID,
  status public.status_aprovacao DEFAULT 'pendente',
  justificativa_solicitacao TEXT,
  decisao_motivo TEXT,
  decidido_por UUID,
  decidido_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Conversation Memory
CREATE TABLE public.whatsapp_conversas_memoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES public.whatsapp_conversas(id),
  conteudo TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  embedding vector(1536),
  expira_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Product Feedback
CREATE TABLE public.whatsapp_feedback_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES public.whatsapp_conversas(id),
  proposta_id UUID,
  produto_id UUID REFERENCES public.produtos(id),
  tipo public.tipo_feedback NOT NULL,
  foi_sugerido BOOLEAN DEFAULT false,
  foi_comprado BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Agent Metrics
CREATE TABLE public.whatsapp_metricas_agente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  whatsapp_conta_id UUID REFERENCES public.whatsapp_contas(id),
  conversas_iniciadas INTEGER DEFAULT 0,
  conversas_finalizadas INTEGER DEFAULT 0,
  mensagens_bot_enviadas INTEGER DEFAULT 0,
  mensagens_humano_recebidas INTEGER DEFAULT 0,
  propostas_geradas INTEGER DEFAULT 0,
  propostas_aceitas INTEGER DEFAULT 0,
  propostas_rejeitadas INTEGER DEFAULT 0,
  tempo_resposta_medio_segundos INTEGER,
  taxa_aceitacao_proposta NUMERIC(5,2),
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(data, whatsapp_conta_id)
);

-- 2.9 EDI / Platform Integration
-- ------------------------------

-- EDI Platforms
CREATE TABLE public.plataformas_edi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  cnpj VARCHAR(20),
  logo_url TEXT,
  endpoint_api TEXT,
  ativo BOOLEAN DEFAULT true,
  configuracoes JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- EDI Quotations
CREATE TABLE public.edi_cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id UUID REFERENCES public.plataformas_edi(id),
  numero_cotacao VARCHAR(50) NOT NULL,
  cliente_nome VARCHAR(200),
  cliente_cnpj VARCHAR(20),
  valor_total_solicitado NUMERIC(15,2),
  valor_total_respondido NUMERIC(15,2),
  total_itens INTEGER DEFAULT 0,
  total_itens_analisados INTEGER DEFAULT 0,
  total_sugestoes_geradas INTEGER DEFAULT 0,
  step_atual VARCHAR(30) DEFAULT 'nova',
  historico_steps JSONB,
  data_limite_resposta TIMESTAMPTZ,
  resgatada_por UUID,
  resgatada_em TIMESTAMPTZ,
  analisado_por_ia BOOLEAN DEFAULT false,
  status_analise_ia public.status_analise_ia,
  analise_iniciada_em TIMESTAMPTZ,
  analise_concluida_em TIMESTAMPTZ,
  tempo_analise_segundos INTEGER,
  modelo_ia_utilizado VARCHAR(50),
  xml_original TEXT,
  xml_resposta TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- EDI Quotation Items
CREATE TABLE public.edi_cotacoes_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES public.edi_cotacoes(id) ON DELETE CASCADE,
  sequencia INTEGER NOT NULL,
  codigo_produto_cliente VARCHAR(50),
  descricao_cliente TEXT,
  quantidade NUMERIC(10,2),
  unidade_medida VARCHAR(10),
  preco_solicitado NUMERIC(15,4),
  produto_id UUID REFERENCES public.produtos(id),
  produto_aceito_ia_id UUID,
  preco_respondido NUMERIC(15,4),
  quantidade_respondida NUMERIC(10,2),
  produtos_sugeridos_ia JSONB,
  analisado BOOLEAN DEFAULT false,
  feedback_vendedor VARCHAR(20),
  feedback_vendedor_em TIMESTAMPTZ,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- EDI Product Bindings
CREATE TABLE public.edi_produtos_vinculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id UUID REFERENCES public.plataformas_edi(id),
  codigo_externo VARCHAR(100) NOT NULL,
  descricao_externa TEXT,
  produto_id UUID REFERENCES public.produtos(id),
  metodo_vinculacao public.metodo_vinculacao DEFAULT 'manual',
  score_ia NUMERIC(5,2),
  ativo BOOLEAN DEFAULT true,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plataforma_id, codigo_externo)
);

-- 2.10 Notifications & Alerts
-- ---------------------------

-- Notifications
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  link TEXT,
  lida BOOLEAN DEFAULT false,
  lida_em TIMESTAMPTZ,
  metadata JSONB,
  criada_em TIMESTAMPTZ DEFAULT now()
);

-- Goal Alerts
CREATE TABLE public.alertas_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID NOT NULL REFERENCES public.metas_equipe(id),
  tipo_alerta VARCHAR(50) NOT NULL,
  severidade VARCHAR(20) NOT NULL,
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT false,
  lido_por UUID,
  lido_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2.11 Document Management (GED)
-- ------------------------------

-- Document Types
CREATE TABLE public.ged_tipos_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  exige_validade BOOLEAN DEFAULT false,
  dias_alerta_vencimento INTEGER DEFAULT 30,
  permite_versoes BOOLEAN DEFAULT true,
  extensoes_permitidas TEXT[],
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE public.ged_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id UUID REFERENCES public.ged_tipos_documento(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  numero_documento VARCHAR(100),
  arquivo_url TEXT NOT NULL,
  arquivo_nome VARCHAR(255) NOT NULL,
  arquivo_tipo VARCHAR(100),
  tamanho_bytes BIGINT,
  data_emissao DATE,
  data_validade DATE,
  status_validade VARCHAR(20),
  versao INTEGER DEFAULT 1,
  documento_pai_id UUID REFERENCES public.ged_documentos(id),
  eh_versao_atual BOOLEAN DEFAULT true,
  tags TEXT[],
  metadata JSONB,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Document Permissions
CREATE TABLE public.ged_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES public.ged_documentos(id),
  tipo VARCHAR(20) NOT NULL,
  nivel VARCHAR(20) NOT NULL,
  usuario_id UUID,
  equipe_id UUID REFERENCES public.equipes(id),
  role_nome VARCHAR(50),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Document Views
CREATE TABLE public.ged_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES public.ged_documentos(id),
  usuario_id UUID,
  tipo_acao VARCHAR(20) NOT NULL,
  dispositivo VARCHAR(50),
  navegador VARCHAR(50),
  ip_address INET,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2.12 Public Proposal Analytics
-- ------------------------------

-- Public Proposal Tokens
CREATE TABLE public.propostas_publicas_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id),
  token VARCHAR(100) NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  expira_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Proposal Analytics
CREATE TABLE public.propostas_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id),
  token VARCHAR(100),
  dispositivo VARCHAR(50),
  sistema_operacional VARCHAR(50),
  navegador VARCHAR(50),
  ip_address INET,
  tempo_total_segundos INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Proposal Section Analytics
CREATE TABLE public.propostas_analytics_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_id UUID REFERENCES public.propostas_analytics(id),
  venda_id UUID REFERENCES public.vendas(id),
  secao VARCHAR(50) NOT NULL,
  tempo_segundos INTEGER DEFAULT 0,
  visualizacoes INTEGER DEFAULT 1,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Proposal Click Analytics
CREATE TABLE public.propostas_analytics_cliques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_id UUID REFERENCES public.propostas_analytics(id),
  venda_id UUID REFERENCES public.vendas(id),
  elemento VARCHAR(100) NOT NULL,
  posicao_x INTEGER,
  posicao_y INTEGER,
  metadata JSONB,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Proposal Responses
CREATE TABLE public.propostas_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id),
  tipo VARCHAR(20) NOT NULL,
  mensagem TEXT,
  ip_address INET,
  dispositivo VARCHAR(50),
  criado_em TIMESTAMPTZ DEFAULT now()
);


-- ==============================================================================
-- SECTION 3: MATERIALIZED VIEWS (16 Views)
-- ==============================================================================

-- Dashboard KPIs
CREATE MATERIALIZED VIEW public.mv_dashboard_kpis AS
SELECT 
  (SELECT count(*) FROM clientes) AS total_clientes,
  (SELECT count(*) FROM produtos) AS total_produtos,
  (SELECT count(*) FROM vendas) AS total_vendas,
  (SELECT count(*) FROM tickets WHERE status = 'aberto') AS tickets_abertos,
  (SELECT COALESCE(sum(CASE WHEN valor_estimado > 0 THEN valor_estimado ELSE COALESCE(valor_total, 0) END), 0)
   FROM vendas WHERE etapa_pipeline NOT IN ('fechamento', 'perdido')) AS valor_pipeline_ativo,
  (SELECT CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE etapa_pipeline = 'fechamento')::numeric / count(*)::numeric) * 100) ELSE 0 END
   FROM vendas) AS taxa_conversao,
  now() AS atualizado_em;

-- Monthly Sales
CREATE MATERIALIZED VIEW public.mv_vendas_por_mes AS
WITH ultimos_meses AS (
  SELECT generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month')::date AS mes
)
SELECT 
  to_char(m.mes, 'Mon') AS mes,
  COALESCE(v.total, 0) AS total,
  COALESCE(v.quantidade, 0) AS quantidade
FROM ultimos_meses m
LEFT JOIN (
  SELECT date_trunc('month', created_at)::date AS mes, sum(COALESCE(valor_final, valor_total, 0)) AS total, count(*) AS quantidade
  FROM vendas WHERE aprovado_em IS NOT NULL
  GROUP BY 1
) v ON m.mes = v.mes
ORDER BY m.mes;

-- Pipeline by Stage
CREATE MATERIALIZED VIEW public.mv_vendas_por_etapa AS
SELECT 
  COALESCE(etapa_pipeline::text, 'prospeccao') AS etapa,
  CASE COALESCE(etapa_pipeline::text, 'prospeccao')
    WHEN 'prospeccao' THEN 'Prospecção'
    WHEN 'qualificacao' THEN 'Qualificação'
    WHEN 'proposta' THEN 'Proposta'
    WHEN 'negociacao' THEN 'Negociação'
    WHEN 'followup_cliente' THEN 'Follow-up'
    WHEN 'fechamento' THEN 'Fechamento'
    WHEN 'perdido' THEN 'Perdido'
    ELSE 'Outros'
  END AS etapa_label,
  count(*) AS quantidade,
  COALESCE(sum(COALESCE(valor_total, valor_estimado, 0)), 0) AS valor_total,
  now() AS atualizado_em
FROM vendas
GROUP BY etapa_pipeline;

-- Top Sellers
CREATE MATERIALIZED VIEW public.mv_top_vendedores AS
SELECT 
  p.id AS vendedor_id,
  COALESCE(p.primeiro_nome || ' ' || p.sobrenome, p.primeiro_nome, 'Vendedor') AS nome,
  COALESCE(mv.meta_valor, 0) AS meta,
  COALESCE(sum(CASE WHEN v.aprovado_em IS NOT NULL THEN COALESCE(v.valor_final, v.valor_total, 0) ELSE 0 END), 0) AS realizado,
  CASE WHEN COALESCE(mv.meta_valor, 0) > 0 THEN round((COALESCE(sum(CASE WHEN v.aprovado_em IS NOT NULL THEN COALESCE(v.valor_final, v.valor_total, 0) ELSE 0 END), 0) / mv.meta_valor) * 100) ELSE 0 END AS percentual,
  now() AS atualizado_em
FROM perfis_usuario p
LEFT JOIN vendas v ON v.vendedor_id = p.id AND v.created_at >= date_trunc('month', now())
LEFT JOIN metas_vendedor mv ON mv.vendedor_id = p.id AND mv.status IN ('ativa', 'andamento') AND now() BETWEEN mv.periodo_inicio AND mv.periodo_fim
WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'sales')
GROUP BY p.id, p.primeiro_nome, p.sobrenome, mv.meta_valor
ORDER BY 4 DESC
LIMIT 10;

-- Clients Summary
CREATE MATERIALIZED VIEW public.mv_clientes_resumo AS
SELECT 
  count(*) AS total_clientes,
  count(*) FILTER (WHERE natureza::text = 'Juridica') AS clientes_pj,
  count(*) FILTER (WHERE natureza::text = 'Fisica') AS clientes_pf,
  COALESCE(sum(lim_credito), 0) AS limite_total,
  count(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS novos_mes,
  (SELECT count(*) FROM contatos) AS total_contatos,
  now() AS atualizado_em
FROM clientes;

-- Clients by Nature
CREATE MATERIALIZED VIEW public.mv_clientes_por_natureza AS
SELECT 
  CASE WHEN natureza::text = 'Juridica' THEN 'Pessoa Jurídica'
       WHEN natureza::text = 'Fisica' THEN 'Pessoa Física'
       ELSE 'Outros' END AS natureza,
  count(*) AS quantidade
FROM clientes
GROUP BY 1;

-- Products Summary
CREATE MATERIALIZED VIEW public.mv_produtos_resumo AS
SELECT 
  count(*) AS total_produtos,
  count(*) FILTER (WHERE COALESCE(quantidade_em_maos, 0) > 0) AS com_estoque,
  count(*) FILTER (WHERE COALESCE(quantidade_em_maos, 0) <= 0) AS sem_estoque,
  count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
  COALESCE(sum(COALESCE(quantidade_em_maos, 0) * COALESCE(preco_venda, 0)), 0) AS valor_estoque,
  CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE embedding IS NOT NULL)::numeric / count(*)::numeric) * 100) ELSE 0 END AS taxa_embedding,
  now() AS atualizado_em
FROM produtos;

-- Tickets Summary
CREATE MATERIALIZED VIEW public.mv_tickets_resumo AS
SELECT 
  count(*) AS total_tickets,
  count(*) FILTER (WHERE status::text = 'aberto') AS tickets_abertos,
  count(*) FILTER (WHERE status::text IN ('resolvido', 'fechado')) AS tickets_resolvidos,
  count(*) FILTER (WHERE prioridade::text IN ('urgente', 'alta')) AS tickets_urgentes,
  CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE status::text IN ('resolvido', 'fechado'))::numeric / count(*)::numeric) * 100) ELSE 0 END AS taxa_resolucao,
  now() AS atualizado_em
FROM tickets;

-- WhatsApp Summary
CREATE MATERIALIZED VIEW public.mv_whatsapp_resumo AS
SELECT 
  count(*) AS total_conversas,
  count(*) FILTER (WHERE status = 'aberta') AS conversas_ativas,
  (SELECT count(*) FROM whatsapp_propostas_comerciais) AS total_propostas,
  (SELECT count(*) FROM whatsapp_propostas_comerciais WHERE status = 'aceita') AS propostas_aceitas,
  now() AS atualizado_em
FROM whatsapp_conversas;

-- Platforms Summary
CREATE MATERIALIZED VIEW public.mv_plataformas_resumo AS
SELECT 
  count(*) AS total_cotacoes,
  count(*) FILTER (WHERE step_atual::text NOT IN ('respondida', 'finalizada')) AS cotacoes_pendentes,
  count(*) FILTER (WHERE step_atual::text IN ('respondida', 'finalizada')) AS cotacoes_respondidas,
  COALESCE(sum(valor_total_respondido), 0) AS valor_total,
  (SELECT count(*) FROM edi_cotacoes_itens) AS total_itens,
  CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE step_atual::text IN ('respondida', 'finalizada'))::numeric / count(*)::numeric) * 100) ELSE 0 END AS taxa_resposta,
  now() AS atualizado_em
FROM edi_cotacoes;

-- Activity Priority (for Focus Zone)
CREATE MATERIALIZED VIEW public.mv_atividades_prioridade AS
SELECT 
  a.id, a.numero_atividade, a.titulo, a.tipo, a.status, a.prioridade,
  a.responsavel_id, a.equipe_id, a.cliente_id, a.venda_id, a.data_vencimento,
  a.score_lead_fit, a.score_engajamento,
  CASE 
    WHEN a.data_vencimento IS NULL THEN 0
    WHEN a.data_vencimento < now() THEN 100
    ELSE GREATEST(0, 100 - (EXTRACT(epoch FROM (a.data_vencimento - now())) / 3600))
  END AS score_decaimento_calculado,
  CASE a.prioridade
    WHEN 'critica' THEN 100
    WHEN 'alta' THEN 75
    WHEN 'media' THEN 50
    WHEN 'baixa' THEN 25
  END AS score_urgencia_calculado,
  (COALESCE(a.score_lead_fit, 50) * COALESCE(a.score_engajamento, 50) / 100
   - CASE WHEN a.data_vencimento IS NULL THEN 0 WHEN a.data_vencimento < now() THEN -100 ELSE GREATEST(0, 100 - (EXTRACT(epoch FROM (a.data_vencimento - now())) / 3600)) END
   + CASE a.prioridade WHEN 'critica' THEN 100 WHEN 'alta' THEN 75 WHEN 'media' THEN 50 WHEN 'baixa' THEN 25 END
   + COALESCE(a.score_valor_potencial, 0) / 10000) AS score_calculado,
  c.nome_abrev AS cliente_nome,
  p.primeiro_nome || ' ' || p.sobrenome AS responsavel_nome,
  now() AS calculado_em
FROM atividades a
LEFT JOIN clientes c ON a.cliente_id = c.id
LEFT JOIN perfis_usuario p ON a.responsavel_id = p.id
WHERE a.excluido_em IS NULL AND a.status IN ('pendente', 'em_andamento', 'aguardando_resposta');


-- ==============================================================================
-- SECTION 4: KEY FUNCTIONS
-- ==============================================================================

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Check if user has any of the roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- Check high hierarchy (admin, director, manager)
CREATE OR REPLACE FUNCTION public.auth_check_high_hierarchy()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.role_hierarquia rh ON rh.role = ur.role
    WHERE ur.user_id = auth.uid() AND rh.nivel <= 3
  )
$$;

-- Check vendas access
CREATE OR REPLACE FUNCTION public.auth_check_vendas_access(_cliente_id uuid, _vendedor_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    _vendedor_id = auth.uid() OR _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = _cliente_id AND c.vendedor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur INNER JOIN public.role_hierarquia rh ON rh.role = ur.role WHERE ur.user_id = auth.uid() AND rh.nivel <= 3)
    OR EXISTS (SELECT 1 FROM public.clientes c INNER JOIN public.membros_equipe me ON me.equipe_id = c.equipe_id WHERE c.id = _cliente_id AND me.usuario_id = auth.uid() AND me.esta_ativo = true)
$$;

-- Get user hierarchy level
CREATE OR REPLACE FUNCTION public.get_nivel_hierarquico(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT MIN(rh.nivel) FROM public.user_roles ur
  JOIN public.role_hierarquia rh ON rh.role = ur.role
  WHERE ur.user_id = _user_id
$$;

-- Hybrid product search
CREATE OR REPLACE FUNCTION public.match_produtos_hibrido(
  query_text text, 
  query_embedding vector, 
  match_threshold double precision DEFAULT 0.5, 
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, referencia_interna text, nome text, narrativa text, preco_venda numeric, quantidade_em_maos numeric, similarity double precision, match_type text)
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  words text[];
  word_count int;
  min_matches int;
  normalized_query text;
BEGIN
  normalized_query := translate(replace(lower(trim(query_text)), ',', '.'), 'áàãâéèêíìîóòõôúùûçñ', 'aaaaeeeiiioooouuucn');
  words := string_to_array(normalized_query, ' ');
  word_count := array_length(words, 1);
  min_matches := GREATEST(1, CEIL(word_count * 0.7));

  RETURN QUERY
  WITH text_matches AS (
    SELECT p.id, p.referencia_interna::text, p.nome, p.narrativa, p.preco_venda, p.quantidade_em_maos, 1.0::float as similarity, 'text'::text as match_type
    FROM produtos p
    WHERE p.quantidade_em_maos > 0
      AND (SELECT COUNT(*) FROM unnest(words) w WHERE translate(lower(p.nome), 'áàãâéèêíìîóòõôúùûçñ', 'aaaaeeeiiioooouuucn') LIKE '%' || w || '%'
           OR translate(lower(p.referencia_interna::text), 'áàãâéèêíìîóòõôúùûçñ', 'aaaaeeeiiioooouuucn') LIKE '%' || w || '%') >= min_matches
  ),
  semantic_matches AS (
    SELECT p.id, p.referencia_interna::text, p.nome, p.narrativa, p.preco_venda, p.quantidade_em_maos, 
           (1 - (p.embedding <=> query_embedding)) as similarity, 'semantic'::text as match_type
    FROM produtos p
    WHERE p.embedding IS NOT NULL AND p.quantidade_em_maos > 0 AND (1 - (p.embedding <=> query_embedding)) > match_threshold
  ),
  combined AS (
    SELECT * FROM text_matches
    UNION ALL
    SELECT * FROM semantic_matches WHERE id NOT IN (SELECT id FROM text_matches)
  )
  SELECT DISTINCT ON (c.id) c.* FROM combined c ORDER BY c.id, c.similarity DESC LIMIT match_count;
END;
$$;

-- Get paginated pipeline data
CREATE OR REPLACE FUNCTION public.get_vendas_pipeline_paginado(
  p_data_inicio timestamptz DEFAULT NULL,
  p_data_fim timestamptz DEFAULT NULL,
  p_limites_por_etapa jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(id uuid, numero_venda text, etapa_pipeline text, probabilidade integer, valor_estimado numeric, data_previsao_fechamento date, created_at timestamptz, cliente_id uuid, cliente_nome text, cliente_cgc text, total_por_etapa bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_nivel int;
  v_equipes_ids uuid[];
BEGIN
  SELECT public.get_nivel_hierarquico(v_user_id) INTO v_nivel;
  SELECT ARRAY(SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = v_user_id AND esta_ativo = true) INTO v_equipes_ids;
  
  RETURN QUERY
  WITH vendas_filtradas AS (
    SELECT v.id, v.numero_venda, v.etapa_pipeline::TEXT, v.probabilidade, COALESCE(v.valor_total, 0) as valor_estimado,
           v.data_previsao_fechamento, v.created_at, v.cliente_id, COALESCE(c.nome_abrev, c.nome_emit) as cliente_nome, c.cgc as cliente_cgc,
           COUNT(*) OVER (PARTITION BY v.etapa_pipeline) as total_por_etapa,
           ROW_NUMBER() OVER (PARTITION BY v.etapa_pipeline ORDER BY v.created_at DESC) as rn
    FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.etapa_pipeline IS NOT NULL
      AND (p_data_inicio IS NULL OR v.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR v.created_at <= p_data_fim)
      AND (v.vendedor_id = v_user_id OR v.user_id = v_user_id OR c.vendedor_id = v_user_id
           OR (v_equipes_ids IS NOT NULL AND v.equipe_id = ANY(v_equipes_ids))
           OR (v_equipes_ids IS NOT NULL AND c.equipe_id = ANY(v_equipes_ids)))
  )
  SELECT vr.id, vr.numero_venda, vr.etapa_pipeline, vr.probabilidade, vr.valor_estimado, vr.data_previsao_fechamento, vr.created_at, 
         vr.cliente_id, vr.cliente_nome, vr.cliente_cgc, vr.total_por_etapa
  FROM vendas_filtradas vr
  WHERE vr.rn <= COALESCE((p_limites_por_etapa->>(vr.etapa_pipeline))::int, 20)
  ORDER BY vr.etapa_pipeline, vr.created_at DESC;
END;
$$;

-- Refresh all dashboard MVs
CREATE OR REPLACE FUNCTION public.refresh_all_dashboard_mvs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_por_mes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_por_etapa;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_vendedores;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_por_natureza;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produtos_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tickets_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_whatsapp_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_plataformas_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_atividades_prioridade;
END;
$$;

-- Generate ticket number
CREATE OR REPLACE FUNCTION public.gerar_numero_ticket()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  ano TEXT; mes TEXT; contador INTEGER; numero TEXT;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YY');
  mes := TO_CHAR(CURRENT_DATE, 'MM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket FROM 8) AS INTEGER)), 0) + 1 INTO contador
  FROM public.tickets WHERE numero_ticket LIKE 'TK' || ano || mes || '%';
  numero := 'TK' || ano || mes || LPAD(contador::TEXT, 4, '0');
  RETURN numero;
END;
$$;

-- Update goal progress
CREATE OR REPLACE FUNCTION public.atualizar_progresso_meta(
  _meta_id uuid, _novo_valor numeric, _origem text DEFAULT 'manual', 
  _referencia_id uuid DEFAULT NULL, _observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _valor_anterior NUMERIC; _valor_objetivo NUMERIC; _percentual NUMERIC; _meta_atingida BOOLEAN;
BEGIN
  SELECT valor_atual, valor_objetivo INTO _valor_anterior, _valor_objetivo FROM public.metas_equipe WHERE id = _meta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta não encontrada'; END IF;
  
  UPDATE public.metas_equipe SET valor_atual = _novo_valor, atualizado_em = now(),
    concluido_em = CASE WHEN _novo_valor >= valor_objetivo AND concluido_em IS NULL THEN now() ELSE concluido_em END,
    status = CASE WHEN _novo_valor >= valor_objetivo THEN 'concluida' ELSE status END
  WHERE id = _meta_id;
  
  INSERT INTO public.progresso_metas (meta_id, valor_anterior, valor_novo, origem, referencia_id, observacao, registrado_por)
  VALUES (_meta_id, _valor_anterior, _novo_valor, _origem, _referencia_id, _observacao, auth.uid());
  
  _percentual := CASE WHEN _valor_objetivo > 0 THEN (_novo_valor / _valor_objetivo * 100) ELSE 0 END;
  _meta_atingida := _novo_valor >= _valor_objetivo;
  
  IF _meta_atingida AND _valor_anterior < _valor_objetivo THEN
    INSERT INTO public.alertas_metas (meta_id, tipo_alerta, severidade, mensagem) VALUES (_meta_id, 'meta_atingida', 'info', 'Meta atingida! Parabéns!');
  END IF;
  
  RETURN jsonb_build_object('sucesso', true, 'valor_anterior', _valor_anterior, 'valor_novo', _novo_valor, 'percentual_conclusao', _percentual, 'meta_atingida', _meta_atingida);
END;
$$;


-- ==============================================================================
-- SECTION 5: KEY TRIGGERS
-- ==============================================================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'updated_at') THEN
    NEW.updated_at = now(); RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'atualizado_em') THEN
    NEW.atualizado_em = now(); RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Set ticket number trigger
CREATE OR REPLACE FUNCTION public.set_numero_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.numero_ticket IS NULL THEN NEW.numero_ticket := gerar_numero_ticket(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_numero_ticket_trigger BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION set_numero_ticket();

-- Set venda defaults trigger
CREATE OR REPLACE FUNCTION public.set_venda_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN NEW.user_id := auth.uid(); END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    IF NEW.vendedor_id IS NULL THEN NEW.vendedor_id := auth.uid(); END IF;
  ELSE
    NEW.vendedor_id := auth.uid();
  END IF;
  IF NEW.numero_venda IS NULL OR NEW.numero_venda = '' THEN
    NEW.numero_venda := 'V' || to_char(now(), 'YYMMDDHH24MISSMS');
  END IF;
  IF NEW.status IS NULL THEN NEW.status := 'rascunho'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_venda_defaults_trigger BEFORE INSERT ON public.vendas FOR EACH ROW EXECUTE FUNCTION set_venda_defaults();

-- Invalidate freight calculation on item change
CREATE OR REPLACE FUNCTION public.invalidar_calculo_frete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE vendas SET frete_calculado = false, updated_at = now() WHERE id = COALESCE(NEW.venda_id, OLD.venda_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER invalidar_frete_on_item AFTER INSERT OR UPDATE OR DELETE ON public.vendas_itens FOR EACH ROW EXECUTE FUNCTION invalidar_calculo_frete();

-- Update conversation metrics on message
CREATE OR REPLACE FUNCTION public.atualizar_conversa_ultima_mensagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE whatsapp_conversas SET ultima_mensagem_em = NEW.criado_em, total_mensagens = total_mensagens + 1,
    total_mensagens_enviadas = CASE WHEN NEW.direcao = 'enviada' THEN total_mensagens_enviadas + 1 ELSE total_mensagens_enviadas END,
    total_mensagens_recebidas = CASE WHEN NEW.direcao = 'recebida' THEN total_mensagens_recebidas + 1 ELSE total_mensagens_recebidas END
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER atualizar_conversa_mensagem AFTER INSERT ON public.whatsapp_mensagens FOR EACH ROW EXECUTE FUNCTION atualizar_conversa_ultima_mensagem();


-- ==============================================================================
-- SECTION 6: INDEXES (Performance Optimization)
-- ==============================================================================

-- Vendas indexes
CREATE INDEX idx_vendas_pipeline_etapa_created ON public.vendas (etapa_pipeline, created_at DESC);
CREATE INDEX idx_vendas_cliente_id ON public.vendas (cliente_id);
CREATE INDEX idx_vendas_vendedor_id ON public.vendas (vendedor_id);
CREATE INDEX idx_vendas_equipe_id ON public.vendas (equipe_id);
CREATE INDEX idx_vendas_status ON public.vendas (status);
CREATE INDEX idx_vendas_aprovado_em ON public.vendas (aprovado_em);

-- Vendas Itens indexes
CREATE INDEX idx_vendas_itens_venda_id ON public.vendas_itens (venda_id);
CREATE INDEX idx_vendas_itens_produto_id ON public.vendas_itens (produto_id);

-- Clientes indexes
CREATE INDEX idx_clientes_vendedor_id ON public.clientes (vendedor_id);
CREATE INDEX idx_clientes_equipe_id ON public.clientes (equipe_id);
CREATE INDEX idx_clientes_cgc ON public.clientes (cgc);
CREATE INDEX idx_clientes_nome ON public.clientes USING gin (nome_emit gin_trgm_ops);

-- Produtos indexes
CREATE INDEX idx_produtos_nome_trgm ON public.produtos USING gin (nome gin_trgm_ops);
CREATE INDEX idx_produtos_referencia ON public.produtos (referencia_interna);
CREATE INDEX idx_produtos_embedding ON public.produtos USING ivfflat (embedding vector_cosine_ops);

-- Atividades indexes
CREATE INDEX idx_atividades_responsavel ON public.atividades (responsavel_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_atividades_cliente ON public.atividades (cliente_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_atividades_venda ON public.atividades (venda_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_atividades_score ON public.atividades (score_prioridade DESC) WHERE excluido_em IS NULL AND status IN ('pendente', 'em_andamento');
CREATE INDEX idx_atividades_vencimento ON public.atividades (data_vencimento) WHERE excluido_em IS NULL AND status IN ('pendente', 'em_andamento');

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles (role);

-- Membros equipe indexes
CREATE INDEX idx_membros_equipe_usuario ON public.membros_equipe (usuario_id) WHERE esta_ativo = true;
CREATE INDEX idx_membros_equipe_equipe ON public.membros_equipe (equipe_id);

-- WhatsApp indexes
CREATE INDEX idx_whatsapp_conversas_conta ON public.whatsapp_conversas (whatsapp_conta_id);
CREATE INDEX idx_whatsapp_conversas_status ON public.whatsapp_conversas (status);
CREATE INDEX idx_whatsapp_mensagens_conversa ON public.whatsapp_mensagens (conversa_id);
CREATE INDEX idx_whatsapp_mensagens_criado ON public.whatsapp_mensagens (criado_em DESC);

-- Tickets indexes
CREATE INDEX idx_tickets_status ON public.tickets (status);
CREATE INDEX idx_tickets_atribuido ON public.tickets (atribuido_para);
CREATE INDEX idx_tickets_cliente ON public.tickets (cliente_id);

-- EDI indexes
CREATE INDEX idx_edi_cotacoes_plataforma ON public.edi_cotacoes (plataforma_id);
CREATE INDEX idx_edi_cotacoes_step ON public.edi_cotacoes (step_atual);
CREATE INDEX idx_edi_cotacoes_itens_cotacao ON public.edi_cotacoes_itens (cotacao_id);


-- ==============================================================================
-- SECTION 7: RLS POLICIES (Summary - 200+ policies)
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_cotacoes_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ged_documentos ENABLE ROW LEVEL SECURITY;

-- Key vendas policies (optimized)
CREATE POLICY vendas_select_otimizado ON public.vendas FOR SELECT USING (
  auth_check_vendas_access(cliente_id, vendedor_id, user_id)
);

CREATE POLICY vendas_insert_otimizado ON public.vendas FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY vendas_update_otimizado ON public.vendas FOR UPDATE USING (
  auth_check_vendas_access(cliente_id, vendedor_id, user_id)
);

CREATE POLICY vendas_delete_otimizado ON public.vendas FOR DELETE USING (
  auth_check_high_hierarchy()
);

-- Key clientes policies
CREATE POLICY clientes_select_otimizado ON public.clientes FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager', 'diretor_comercial', 'gerente_comercial'))
  OR vendedor_id = auth.uid() OR user_id = auth.uid()
  OR (equipe_id IS NOT NULL AND EXISTS (SELECT 1 FROM membros_equipe me WHERE me.equipe_id = clientes.equipe_id AND me.usuario_id = auth.uid() AND me.esta_ativo = true))
);

-- Products are readable by all authenticated users
CREATE POLICY produtos_select_all ON public.produtos FOR SELECT USING (auth.uid() IS NOT NULL);

-- Notifications are user-specific
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY notificacoes_insert ON public.notificacoes FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE USING (usuario_id = auth.uid());


-- ==============================================================================
-- SECTION 8: SEED DATA
-- ==============================================================================

-- Role hierarchy
INSERT INTO public.role_hierarquia (role, nivel, pode_acessar_menu_tecnico, descricao) VALUES
  ('admin', 1, true, 'Administrador do Sistema'),
  ('diretor_comercial', 2, true, 'Diretor Comercial'),
  ('gerente_comercial', 3, true, 'Gerente Comercial'),
  ('coordenador_comercial', 4, true, 'Coordenador Comercial'),
  ('manager', 3, true, 'Gerente'),
  ('gestor_equipe', 5, false, 'Gestor de Equipe'),
  ('lider', 5, false, 'Líder de Equipe'),
  ('representante_comercial', 6, false, 'Representante Comercial'),
  ('executivo_contas', 6, false, 'Executivo de Contas'),
  ('sales', 6, false, 'Vendedor'),
  ('consultor_vendas', 7, false, 'Consultor de Vendas'),
  ('backoffice', 8, false, 'Backoffice'),
  ('warehouse', 8, false, 'Almoxarifado'),
  ('support', 8, false, 'Suporte')
ON CONFLICT (role) DO NOTHING;

-- Default pipeline
INSERT INTO public.pipelines (id, nome, descricao, esta_ativo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Pipeline Principal', 'Pipeline padrão de vendas', true)
ON CONFLICT DO NOTHING;

-- Freight types
INSERT INTO public.tipos_frete (codigo, nome, cod_canal_venda, api_tipo_frete) VALUES
  ('CIF', 'CIF', 20, 'cif'),
  ('CIF-NF', 'CIF - INCLUSÃO NA NF', 22, 'cif'),
  ('FOB', 'FOB', NULL, 'fob'),
  ('FOB-C', 'FOB - Cliente', NULL, 'fob'),
  ('SEM', 'Sem Frete', NULL, 'sem_frete')
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- END OF DUMP
-- ==============================================================================
