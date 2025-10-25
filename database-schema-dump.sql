-- ================================================
-- DUMP DO SCHEMA DO BANCO DE DADOS
-- Data de Geração: 25/10/2025
-- Sistema: CRM/ERP com integração WhatsApp e EDI
-- ================================================

-- ================================================
-- EXTENSÕES
-- ================================================

CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================
-- TIPOS ENUM
-- ================================================

-- Roles do sistema
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'sales', 'warehouse', 'support');

-- Pipeline de vendas
CREATE TYPE etapa_pipeline AS ENUM ('prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido');

-- Tipos de identificação
CREATE TYPE identificacao_tipo AS ENUM ('Cliente', 'Fornecedor', 'Ambos');

-- Natureza jurídica
CREATE TYPE natureza_tipo AS ENUM ('Juridica', 'Fisica');

-- Prioridade de tickets
CREATE TYPE prioridade_ticket AS ENUM ('baixa', 'normal', 'alta', 'urgente');

-- Status de tickets
CREATE TYPE status_ticket AS ENUM ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado', 'cancelado');

-- Tipos de endereço
CREATE TYPE tipo_endereco AS ENUM ('principal', 'entrega', 'cobranca');

-- Tipos de ticket
CREATE TYPE tipo_ticket AS ENUM ('reclamacao', 'duvida', 'sugestao', 'elogio', 'garantia', 'troca', 'devolucao');

-- Yes/No
CREATE TYPE yes_no AS ENUM ('YES', 'NO');

-- ================================================
-- FUNÇÕES AUXILIARES
-- ================================================

-- Função para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND user_roles.role = $2
  );
$$;

-- Função para verificar se usuário tem qualquer uma das roles
CREATE OR REPLACE FUNCTION public.has_any_role(user_id uuid, roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND user_roles.role = ANY($2)
  );
$$;

-- Função para listar usuários com suas roles
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE(
  user_id uuid,
  email text,
  roles app_role[],
  is_admin boolean,
  is_manager boolean,
  is_sales boolean,
  is_warehouse boolean,
  is_support boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    u.id as user_id,
    u.email,
    array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
    bool_or(ur.role = 'admin') as is_admin,
    bool_or(ur.role = 'manager') as is_manager,
    bool_or(ur.role = 'sales') as is_sales,
    bool_or(ur.role = 'warehouse') as is_warehouse,
    bool_or(ur.role = 'support') as is_support
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.email
  ORDER BY u.email;
$$;

-- Função para obter roles de um usuário específico
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  roles app_role[],
  is_admin boolean,
  is_manager boolean,
  is_sales boolean,
  is_warehouse boolean,
  is_support boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    _user_id as user_id,
    (SELECT email FROM auth.users WHERE id = _user_id) as email,
    array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
    bool_or(ur.role = 'admin') as is_admin,
    bool_or(ur.role = 'manager') as is_manager,
    bool_or(ur.role = 'sales') as is_sales,
    bool_or(ur.role = 'warehouse') as is_warehouse,
    bool_or(ur.role = 'support') as is_support
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  GROUP BY _user_id;
$$;

-- Função para gerar número de ticket
CREATE OR REPLACE FUNCTION public.gerar_numero_ticket()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Função para calcular tempo efetivo do ticket
CREATE OR REPLACE FUNCTION public.calcular_tempo_efetivo_ticket(ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ticket_data RECORD;
  tempo_total_horas NUMERIC;
  tempo_pausado NUMERIC;
  tempo_efetivo NUMERIC;
  result JSONB;
BEGIN
  SELECT 
    data_abertura,
    resolvido_em,
    fechado_em,
    tempo_pausado_horas,
    esta_pausado,
    pausado_em
  INTO ticket_data
  FROM public.tickets
  WHERE id = ticket_id;
  
  IF ticket_data.fechado_em IS NOT NULL THEN
    tempo_total_horas := EXTRACT(EPOCH FROM (ticket_data.fechado_em - ticket_data.data_abertura))::NUMERIC / 3600;
  ELSIF ticket_data.resolvido_em IS NOT NULL THEN
    tempo_total_horas := EXTRACT(EPOCH FROM (ticket_data.resolvido_em - ticket_data.data_abertura))::NUMERIC / 3600;
  ELSE
    tempo_total_horas := EXTRACT(EPOCH FROM (now() - ticket_data.data_abertura))::NUMERIC / 3600;
  END IF;
  
  tempo_pausado := COALESCE(ticket_data.tempo_pausado_horas::NUMERIC, 0);
  
  IF ticket_data.esta_pausado AND ticket_data.pausado_em IS NOT NULL THEN
    tempo_pausado := tempo_pausado + (EXTRACT(EPOCH FROM (now() - ticket_data.pausado_em))::NUMERIC / 3600);
  END IF;
  
  tempo_efetivo := tempo_total_horas - tempo_pausado;
  
  IF tempo_efetivo < 0 THEN
    tempo_efetivo := 0;
  END IF;
  
  result := jsonb_build_object(
    'tempo_total_horas', tempo_total_horas,
    'tempo_pausado_horas', tempo_pausado,
    'tempo_efetivo_horas', tempo_efetivo,
    'esta_pausado', ticket_data.esta_pausado
  );
  
  RETURN result;
END;
$$;

-- Função para obter itens pendentes de vinculação
CREATE OR REPLACE FUNCTION public.get_pending_items()
RETURNS TABLE(
  item_id uuid,
  cotacao_id uuid,
  plataforma_id uuid,
  cnpj_cliente character varying,
  descricao_produto_cliente text,
  codigo_produto_cliente character varying,
  quantidade_solicitada numeric,
  unidade_medida character varying,
  numero_item integer,
  id_item_externo character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eci.id as item_id,
    eci.cotacao_id,
    ec.plataforma_id,
    ec.cnpj_cliente,
    eci.descricao_produto_cliente,
    eci.codigo_produto_cliente,
    eci.quantidade_solicitada,
    eci.unidade_medida,
    eci.numero_item,
    eci.id_item_externo
  FROM edi_cotacoes_itens eci
  INNER JOIN edi_cotacoes ec ON ec.id = eci.cotacao_id
  WHERE eci.produto_id IS NULL
    AND eci.status = 'pendente'
    AND ec.resgatada = true
  ORDER BY ec.data_vencimento_atual ASC, eci.numero_item ASC;
END;
$$;

-- ================================================
-- TRIGGERS FUNCTIONS
-- ================================================

-- Atualizar updated_at genérico
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- Atualizar updated_at para EDI
CREATE OR REPLACE FUNCTION public.atualizar_updated_at_edi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Atualizar timestamp WhatsApp
CREATE OR REPLACE FUNCTION public.atualizar_whatsapp_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- Atualizar total de interações de ticket
CREATE OR REPLACE FUNCTION public.atualizar_total_interacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tickets
  SET total_interacoes = total_interacoes + 1
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

-- Atualizar tempo pausado do ticket
CREATE OR REPLACE FUNCTION public.atualizar_tempo_pausado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Atualizar última mensagem da conversa WhatsApp
CREATE OR REPLACE FUNCTION public.atualizar_conversa_ultima_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Atualizar métricas do contato WhatsApp
CREATE OR REPLACE FUNCTION public.atualizar_metricas_whatsapp_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.direcao = 'enviada' THEN
        UPDATE whatsapp_contatos 
        SET total_mensagens_enviadas = total_mensagens_enviadas + 1,
            ultima_mensagem_enviada_em = NEW.criado_em,
            ultima_mensagem_em = NEW.criado_em
        WHERE id = NEW.whatsapp_contato_id;
    ELSIF NEW.direcao = 'recebida' THEN
        UPDATE whatsapp_contatos 
        SET total_mensagens_recebidas = total_mensagens_recebidas + 1,
            ultima_mensagem_recebida_em = NEW.criado_em,
            ultima_mensagem_em = NEW.criado_em
        WHERE id = NEW.whatsapp_contato_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ================================================
-- TABELAS
-- ================================================

-- Tabela: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela: perfis_usuario
CREATE TABLE IF NOT EXISTS public.perfis_usuario (
    id uuid PRIMARY KEY NOT NULL,
    empresa_id uuid,
    perfil_id uuid,
    gerente_id uuid,
    esta_ativo boolean DEFAULT true,
    ultimo_login_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    primeiro_nome character varying,
    sobrenome character varying,
    nome_completo character varying,
    url_avatar character varying,
    telefone character varying,
    celular character varying,
    cargo character varying,
    departamento character varying,
    fuso_horario character varying DEFAULT 'America/Sao_Paulo',
    idioma character varying DEFAULT 'pt-BR'
);

ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;

-- Tabela: empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_empresa character varying NOT NULL,
    cnpj character varying,
    razao_social character varying,
    inscricao_estadual character varying,
    telefone character varying,
    email character varying,
    site character varying,
    esta_ativa boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    excluido_em timestamp with time zone
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    cod_emitente integer DEFAULT 0,
    nome_emit text,
    identific identificacao_tipo DEFAULT 'Cliente'::identificacao_tipo NOT NULL,
    natureza natureza_tipo DEFAULT 'Juridica'::natureza_tipo NOT NULL,
    nome_abrev character varying(100),
    cod_gr_cli integer,
    cod_rep integer,
    cgc character varying(14),
    ins_estadual character varying(20),
    atividade character varying(100),
    coligada character varying(100),
    telefone1 character varying(20),
    e_mail character varying(255),
    email_xml character varying(255),
    email_financeiro character varying(255),
    equipevendas character varying(100),
    cod_suframa character varying(50),
    lim_credito numeric(15,2) DEFAULT 0.00,
    ind_cre_cli character varying(50) DEFAULT 'Normal',
    limite_disponivel numeric(15,2) DEFAULT 0.00,
    cod_cond_pag integer DEFAULT 0,
    cond_pag_fixa yes_no DEFAULT 'NO'::yes_no,
    nat_operacao character varying(10),
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    conta_id uuid
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Tabela: produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    cod_produto integer DEFAULT 0,
    cod_produto_orig character varying(50),
    cod_gru_pro integer,
    descricao text NOT NULL,
    embalagem character varying(50),
    unidade character varying(10) DEFAULT 'UN',
    preco_venda numeric(15,2) DEFAULT 0.00,
    estoque_atual numeric(15,3) DEFAULT 0.000,
    estoque_minimo numeric(15,3) DEFAULT 0.000,
    peso_liquido numeric(15,3),
    peso_bruto numeric(15,3),
    ncm character varying(8),
    codigo_barras character varying(13),
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Tabela: estoque
CREATE TABLE IF NOT EXISTS public.estoque (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    produto_id uuid NOT NULL,
    quantidade numeric(15,3) DEFAULT 0.000 NOT NULL,
    localizacao character varying(100),
    lote character varying(50),
    data_validade date,
    data_entrada timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

-- Tabela: vendas
CREATE TABLE IF NOT EXISTS public.vendas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_venda text NOT NULL,
    cliente_nome text NOT NULL,
    cliente_cnpj text,
    data_venda timestamp with time zone DEFAULT now() NOT NULL,
    valor_total numeric DEFAULT 0.00 NOT NULL,
    desconto numeric DEFAULT 0.00 NOT NULL,
    valor_final numeric DEFAULT 0.00 NOT NULL,
    status text DEFAULT 'rascunho' NOT NULL,
    observacoes text,
    user_id uuid NOT NULL,
    condicao_pagamento_id uuid,
    tipo_frete_id uuid,
    tipo_pedido_id uuid,
    etapa_pipeline etapa_pipeline DEFAULT 'prospeccao',
    valor_estimado numeric DEFAULT 0.00,
    probabilidade integer DEFAULT 50,
    data_fechamento_prevista date,
    responsavel_id uuid,
    motivo_perda text,
    origem_lead text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Tabela: vendas_itens
CREATE TABLE IF NOT EXISTS public.vendas_itens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venda_id uuid NOT NULL,
    produto_id uuid NOT NULL,
    quantidade numeric NOT NULL,
    preco_unitario numeric NOT NULL,
    desconto numeric DEFAULT 0.00 NOT NULL,
    valor_total numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;

-- Tabela: condicoes_pagamento
CREATE TABLE IF NOT EXISTS public.condicoes_pagamento (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_integracao character varying UNIQUE,
    descricao character varying NOT NULL,
    dias_prazo integer DEFAULT 0,
    percentual_entrada numeric DEFAULT 0,
    ativa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;

-- Tabela: tipos_frete
CREATE TABLE IF NOT EXISTS public.tipos_frete (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_integracao character varying,
    descricao character varying NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.tipos_frete ENABLE ROW LEVEL SECURITY;

-- Tabela: tipos_pedido
CREATE TABLE IF NOT EXISTS public.tipos_pedido (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_integracao character varying,
    descricao character varying NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.tipos_pedido ENABLE ROW LEVEL SECURITY;

-- Tabela: tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_ticket text NOT NULL,
    titulo text NOT NULL,
    descricao text NOT NULL,
    tipo tipo_ticket DEFAULT 'reclamacao' NOT NULL,
    status status_ticket DEFAULT 'aberto' NOT NULL,
    prioridade prioridade_ticket DEFAULT 'normal' NOT NULL,
    cliente_nome text NOT NULL,
    cliente_email text,
    cliente_telefone text,
    venda_id uuid,
    produto_id uuid,
    aberto_por uuid,
    atribuido_para uuid,
    atribuido_em timestamp with time zone,
    data_abertura timestamp with time zone DEFAULT now() NOT NULL,
    prazo_resposta timestamp with time zone,
    prazo_resolucao timestamp with time zone,
    resolvido_em timestamp with time zone,
    fechado_em timestamp with time zone,
    tempo_primeira_resposta_horas integer,
    tempo_resolucao_horas integer,
    total_interacoes integer DEFAULT 0,
    avaliacao integer,
    avaliado_em timestamp with time zone,
    comentario_avaliacao text,
    tags text[],
    anexos jsonb DEFAULT '[]'::jsonb,
    tempo_pausado_horas integer DEFAULT 0,
    pausado_em timestamp with time zone,
    esta_pausado boolean DEFAULT false,
    motivo_pausa text,
    fila_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Tabela: filas_atendimento
CREATE TABLE IF NOT EXISTS public.filas_atendimento (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    cor text DEFAULT '#3B82F6' NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    esta_ativa boolean DEFAULT true NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.filas_atendimento ENABLE ROW LEVEL SECURITY;

-- Tabela: chat_assistente_mensagens
CREATE TABLE IF NOT EXISTS public.chat_assistente_mensagens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_assistente_mensagens ENABLE ROW LEVEL SECURITY;

-- Tabela: contas
CREATE TABLE IF NOT EXISTS public.contas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_conta character varying NOT NULL,
    tipo_conta character varying,
    site character varying,
    setor character varying,
    receita_anual numeric,
    numero_funcionarios integer,
    classificacao character varying,
    estagio_ciclo_vida character varying,
    origem_lead character varying,
    descricao text,
    proprietario_id uuid,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    excluido_em timestamp with time zone
);

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

-- Tabela: contatos
CREATE TABLE IF NOT EXISTS public.contatos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conta_id uuid,
    nome_completo character varying NOT NULL,
    email character varying,
    telefone character varying,
    celular character varying,
    cargo character varying,
    departamento character varying,
    data_nascimento date,
    eh_contato_principal boolean DEFAULT false,
    observacoes text,
    proprietario_id uuid,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    excluido_em timestamp with time zone,
    cliente_id uuid
);

ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Tabela: oportunidades
CREATE TABLE IF NOT EXISTS public.oportunidades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_oportunidade character varying NOT NULL,
    conta_id uuid,
    contato_id uuid,
    pipeline_id uuid,
    estagio_id uuid,
    valor numeric,
    receita_esperada numeric,
    data_fechamento date,
    percentual_probabilidade integer,
    tipo character varying,
    origem_lead character varying,
    proximo_passo text,
    descricao text,
    concorrentes text,
    motivo_perda character varying,
    proprietario_id uuid,
    esta_fechada boolean DEFAULT false,
    foi_ganha boolean DEFAULT false,
    fechada_em timestamp with time zone,
    dias_no_estagio integer DEFAULT 0,
    ultima_mudanca_estagio_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    excluido_em timestamp with time zone,
    criado_por uuid,
    atualizado_por uuid
);

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

-- Tabela: plataformas_edi
CREATE TABLE IF NOT EXISTS public.plataformas_edi (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome character varying NOT NULL,
    slug character varying NOT NULL,
    tipo_plataforma character varying NOT NULL,
    ambiente character varying DEFAULT 'homologacao',
    formato_dados character varying DEFAULT 'xml',
    configuracoes jsonb DEFAULT '{}'::jsonb NOT NULL,
    mapeamento_campos jsonb DEFAULT '{}'::jsonb NOT NULL,
    intervalo_consulta_minutos integer DEFAULT 5,
    ativo boolean DEFAULT true,
    ultima_consulta_em timestamp with time zone,
    total_cotacoes_baixadas integer DEFAULT 0,
    total_pedidos_baixados integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    criado_por uuid,
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.plataformas_edi ENABLE ROW LEVEL SECURITY;

-- Tabela: edi_cotacoes
CREATE TABLE IF NOT EXISTS public.edi_cotacoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plataforma_id uuid,
    cnpj_cliente character varying NOT NULL,
    id_cotacao_externa character varying NOT NULL,
    numero_cotacao_portal character varying,
    dados_originais jsonb NOT NULL,
    data_criacao_portal timestamp with time zone,
    data_vencimento_original timestamp with time zone,
    data_vencimento_atual timestamp with time zone,
    observacoes_portal text,
    condicao_pagamento_portal character varying,
    tipo_frete_portal character varying,
    valor_total_cotacao numeric,
    resgatada boolean DEFAULT false,
    resgatada_por uuid,
    resgatada_em timestamp with time zone,
    respondida boolean DEFAULT false,
    respondida_em timestamp with time zone,
    total_itens integer DEFAULT 0,
    total_itens_respondidos integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.edi_cotacoes ENABLE ROW LEVEL SECURITY;

-- Tabela: edi_cotacoes_itens
CREATE TABLE IF NOT EXISTS public.edi_cotacoes_itens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cotacao_id uuid,
    produto_vinculo_id uuid,
    produto_id uuid,
    numero_item integer,
    id_item_externo character varying,
    codigo_produto_cliente character varying,
    descricao_produto_cliente text NOT NULL,
    marca_cliente character varying,
    quantidade_solicitada numeric NOT NULL,
    unidade_medida character varying,
    unidade_medida_portal character varying,
    id_unidade_medida_portal character varying,
    quantidade_respondida numeric,
    quantidade_confirmada numeric,
    preco_unitario_respondido numeric,
    percentual_desconto numeric DEFAULT 0,
    valor_desconto numeric DEFAULT 0,
    preco_total numeric,
    dados_originais jsonb NOT NULL,
    detalhes_resposta jsonb DEFAULT '{}'::jsonb,
    produtos_sugeridos_ia jsonb,
    status character varying DEFAULT 'pendente',
    respondido_em timestamp with time zone,
    confirmado_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.edi_cotacoes_itens ENABLE ROW LEVEL SECURITY;

-- Tabela: edi_produtos_vinculo
CREATE TABLE IF NOT EXISTS public.edi_produtos_vinculo (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plataforma_id uuid,
    cnpj_cliente character varying NOT NULL,
    codigo_produto_cliente character varying,
    descricao_cliente text,
    codigo_ean character varying,
    codigo_simpro character varying,
    codigo_produto_fornecedor character varying,
    produto_id uuid,
    sugerido_por_ia boolean DEFAULT false,
    score_confianca numeric,
    sugerido_em timestamp with time zone,
    prompt_ia text,
    resposta_ia jsonb,
    aprovado_por uuid,
    aprovado_em timestamp with time zone,
    eh_produto_alternativo boolean DEFAULT false,
    ordem_prioridade integer DEFAULT 1,
    preco_padrao numeric,
    desconto_padrao numeric DEFAULT 0,
    estoque_minimo numeric,
    ultima_cotacao_em timestamp with time zone,
    ultimo_preco_respondido numeric,
    total_cotacoes_respondidas integer DEFAULT 0,
    total_pedidos_ganhos integer DEFAULT 0,
    total_pedidos_perdidos integer DEFAULT 0,
    taxa_conversao numeric DEFAULT 0,
    observacoes text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    criado_por uuid,
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.edi_produtos_vinculo ENABLE ROW LEVEL SECURITY;

-- Tabela: whatsapp_contas
CREATE TABLE IF NOT EXISTS public.whatsapp_contas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_conta character varying NOT NULL,
    numero_whatsapp character varying NOT NULL,
    provider character varying NOT NULL,
    account_sid character varying,
    business_account_id character varying,
    phone_number_id character varying,
    app_id character varying,
    api_key character varying,
    nome_exibicao character varying,
    foto_perfil_url character varying,
    descricao_negocio text,
    categoria_negocio character varying,
    site character varying,
    email_contato character varying,
    endereco text,
    status character varying DEFAULT 'ativo',
    qualidade_conta character varying,
    verificada boolean DEFAULT false,
    limite_mensagens_dia integer DEFAULT 1000,
    resposta_automatica_ativa boolean DEFAULT true,
    mensagem_fora_horario text,
    horario_atendimento jsonb,
    webhook_url character varying,
    webhook_verificado boolean DEFAULT false,
    total_mensagens_enviadas integer DEFAULT 0,
    total_mensagens_recebidas integer DEFAULT 0,
    total_conversas integer DEFAULT 0,
    ultima_sincronizacao_em timestamp with time zone,
    conectada_em timestamp with time zone,
    desconectada_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    excluido_em timestamp with time zone,
    criado_por uuid NOT NULL
);

ALTER TABLE public.whatsapp_contas ENABLE ROW LEVEL SECURITY;

-- Tabela: whatsapp_contatos
CREATE TABLE IF NOT EXISTS public.whatsapp_contatos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp_conta_id uuid NOT NULL,
    numero_whatsapp character varying NOT NULL,
    nome_contato character varying,
    foto_perfil_url character varying,
    contato_id uuid,
    conta_id uuid,
    is_bloqueado boolean DEFAULT false,
    bloqueado_em timestamp with time zone,
    bloqueado_por uuid,
    motivo_bloqueio text,
    tags text[],
    observacoes text,
    total_mensagens_enviadas integer DEFAULT 0,
    total_mensagens_recebidas integer DEFAULT 0,
    total_conversas integer DEFAULT 0,
    ultima_mensagem_em timestamp with time zone,
    ultima_mensagem_enviada_em timestamp with time zone,
    ultima_mensagem_recebida_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.whatsapp_contatos ENABLE ROW LEVEL SECURITY;

-- Tabela: whatsapp_conversas
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp_conta_id uuid NOT NULL,
    whatsapp_contato_id uuid NOT NULL,
    conversa_externa_id character varying,
    contato_id uuid,
    conta_id uuid,
    oportunidade_id uuid,
    titulo character varying,
    status character varying DEFAULT 'aberta',
    prioridade character varying DEFAULT 'normal',
    tipo_conversa character varying,
    origem character varying,
    categoria character varying,
    atribuida_para_id uuid,
    atribuida_em timestamp with time zone,
    atribuicao_automatica boolean DEFAULT true,
    janela_24h_ativa boolean DEFAULT false,
    janela_aberta_em timestamp with time zone,
    janela_fecha_em timestamp with time zone,
    gerenciada_por_bot boolean DEFAULT false,
    transferida_para_humano boolean DEFAULT false,
    transferida_em timestamp with time zone,
    sentimento_cliente character varying,
    emoji_sentimento character varying,
    ultima_analise_sentimento_em timestamp with time zone,
    mensagens_analisadas integer DEFAULT 0,
    total_mensagens integer DEFAULT 0,
    total_mensagens_enviadas integer DEFAULT 0,
    total_mensagens_recebidas integer DEFAULT 0,
    tempo_primeira_resposta_minutos integer,
    tempo_total_resposta_minutos integer,
    avaliacao_satisfacao integer,
    avaliada_em timestamp with time zone,
    comentario_avaliacao text,
    tags text[],
    iniciada_em timestamp with time zone DEFAULT now(),
    ultima_mensagem_em timestamp with time zone,
    ultima_interacao_agente_em timestamp with time zone,
    ultima_interacao_cliente_em timestamp with time zone,
    resolvida_em timestamp with time zone,
    fechada_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;

-- Tabela: whatsapp_mensagens
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversa_id uuid NOT NULL,
    whatsapp_contato_id uuid NOT NULL,
    whatsapp_conta_id uuid NOT NULL,
    mensagem_externa_id character varying,
    mensagem_externa_timestamp timestamp with time zone,
    direcao character varying NOT NULL,
    tipo_mensagem character varying NOT NULL,
    conteudo_texto text,
    conteudo_media jsonb,
    metadata jsonb,
    status_entrega character varying,
    entregue_em timestamp with time zone,
    lida_em timestamp with time zone,
    falha_motivo text,
    criado_em timestamp with time zone DEFAULT now(),
    enviado_por uuid
);

ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

-- Tabela: ura_configuracoes
CREATE TABLE IF NOT EXISTS public.ura_configuracoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    ativa boolean DEFAULT true,
    fluxo_inicial jsonb NOT NULL,
    numero_telefone text,
    horario_funcionamento jsonb,
    mensagem_boas_vindas text,
    mensagem_fora_horario text,
    mensagem_timeout text,
    timeout_segundos integer DEFAULT 30,
    max_tentativas integer DEFAULT 3,
    gravar_ligacoes boolean DEFAULT false,
    transcricao_ativa boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT now(),
    criado_por uuid,
    atualizado_em timestamp with time zone DEFAULT now(),
    atualizado_por uuid
);

ALTER TABLE public.ura_configuracoes ENABLE ROW LEVEL SECURITY;

-- Tabela: historico_ligacoes
CREATE TABLE IF NOT EXISTS public.historico_ligacoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ura_id uuid,
    conta_id uuid,
    cliente_id uuid,
    numero_origem character varying NOT NULL,
    numero_destino character varying,
    call_sid character varying,
    direcao character varying NOT NULL,
    status character varying NOT NULL,
    duracao_segundos integer,
    custo_ligacao numeric(10,4),
    gravacao_url character varying,
    transcricao_texto text,
    fluxo_percorrido jsonb,
    opcoes_selecionadas jsonb,
    criado_ticket boolean DEFAULT false,
    ticket_id uuid,
    iniciada_em timestamp with time zone DEFAULT now(),
    encerrada_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    iniciada_por uuid
);

ALTER TABLE public.historico_ligacoes ENABLE ROW LEVEL SECURITY;

-- ================================================
-- ÍNDICES
-- ================================================

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cgc ON public.clientes(cgc);
CREATE INDEX IF NOT EXISTS idx_clientes_nome_emit ON public.clientes(nome_emit);
CREATE INDEX IF NOT EXISTS idx_clientes_cod_emitente ON public.clientes(cod_emitente);
CREATE INDEX IF NOT EXISTS idx_clientes_conta ON public.clientes(conta_id) WHERE conta_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_cgc_per_user ON public.clientes(user_id, cgc);
CREATE UNIQUE INDEX IF NOT EXISTS unique_cod_emitente_per_user ON public.clientes(user_id, cod_emitente);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON public.produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_cod_produto ON public.produtos(cod_produto);
CREATE INDEX IF NOT EXISTS idx_produtos_descricao ON public.produtos(descricao);

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_aberto_por ON public.tickets(aberto_por);
CREATE INDEX IF NOT EXISTS idx_tickets_atribuido_para ON public.tickets(atribuido_para);
CREATE INDEX IF NOT EXISTS idx_tickets_fila ON public.tickets(fila_id);

-- Índices para WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_conta ON public.whatsapp_conversas(whatsapp_conta_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_contato ON public.whatsapp_conversas(whatsapp_contato_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_conversa ON public.whatsapp_mensagens(conversa_id);

-- Índices para EDI
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_plataforma ON public.edi_cotacoes(plataforma_id);
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_cnpj ON public.edi_cotacoes(cnpj_cliente);
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_cotacao ON public.edi_cotacoes_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_edi_produtos_vinculo_plataforma ON public.edi_produtos_vinculo(plataforma_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Políticas para user_roles
CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver suas próprias roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- Políticas para clientes
CREATE POLICY "Users can view their own clientes"
ON public.clientes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clientes"
ON public.clientes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes"
ON public.clientes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes"
ON public.clientes FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para produtos
CREATE POLICY "Users can view their own produtos"
ON public.produtos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own produtos"
ON public.produtos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own produtos"
ON public.produtos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own produtos"
ON public.produtos FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para tickets
CREATE POLICY "Usuários podem visualizar tickets"
ON public.tickets FOR SELECT
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales']) OR
    aberto_por = auth.uid() OR
    atribuido_para = auth.uid()
);

CREATE POLICY "Sales podem criar tickets"
ON public.tickets FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales']));

CREATE POLICY "Usuários podem atualizar tickets atribuídos ou próprios"
ON public.tickets FOR UPDATE
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'manager']) OR
    aberto_por = auth.uid() OR
    atribuido_para = auth.uid()
);

CREATE POLICY "Admins podem deletar tickets"
ON public.tickets FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Políticas para WhatsApp
CREATE POLICY "Admins e Managers podem gerenciar contas WhatsApp"
ON public.whatsapp_contas FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'manager']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Usuários podem visualizar conversas WhatsApp"
ON public.whatsapp_conversas FOR SELECT
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales']) OR
    atribuida_para_id = auth.uid()
);

-- Políticas para EDI
CREATE POLICY "Admins e Managers podem gerenciar plataformas"
ON public.plataformas_edi FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Usuários podem visualizar cotações"
ON public.edi_cotacoes FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales']));

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger para atualizar updated_at em clientes
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_updated_at();

-- Trigger para atualizar updated_at em produtos
CREATE TRIGGER update_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_updated_at();

-- Trigger para atualizar updated_at em tickets
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_updated_at();

-- Trigger para atualizar métricas de WhatsApp
CREATE TRIGGER atualizar_conversa_ultima_mensagem_trigger
    AFTER INSERT ON public.whatsapp_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_conversa_ultima_mensagem();

-- ================================================
-- FIM DO DUMP
-- ================================================

-- Observações:
-- 1. Este dump contém a estrutura completa do banco de dados
-- 2. Inclui tipos ENUM, funções, tabelas, índices, políticas RLS e triggers
-- 3. Não inclui dados (apenas estrutura)
-- 4. Algumas funções do sistema (gin_btree_*) foram omitidas por serem internas do PostgreSQL
