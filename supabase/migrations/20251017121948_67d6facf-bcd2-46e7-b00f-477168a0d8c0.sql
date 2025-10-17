-- =====================================================
-- MÓDULO WHATSAPP - ESTRUTURA COMPLETA
-- Integrado com CRM - Adaptado para Supabase
-- =====================================================

-- =====================================================
-- 1. CONTAS WHATSAPP BUSINESS
-- =====================================================

CREATE TABLE whatsapp_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_conta VARCHAR(150) NOT NULL,
    numero_whatsapp VARCHAR(20) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('twilio', 'meta', '360dialog', 'messagebird')),
    
    -- Credenciais (criptografadas - armazenar em secrets)
    account_sid VARCHAR(255),
    business_account_id VARCHAR(255),
    phone_number_id VARCHAR(255),
    
    -- Configurações
    nome_exibicao VARCHAR(150),
    foto_perfil_url VARCHAR(500),
    descricao_negocio TEXT,
    categoria_negocio VARCHAR(100),
    site VARCHAR(255),
    email_contato VARCHAR(255),
    endereco TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'desconectado')),
    verificada BOOLEAN DEFAULT false,
    qualidade_conta VARCHAR(50) CHECK (qualidade_conta IN ('alta', 'media', 'baixa')),
    limite_mensagens_dia INTEGER DEFAULT 1000,
    
    -- Configurações de automação
    resposta_automatica_ativa BOOLEAN DEFAULT true,
    mensagem_fora_horario TEXT,
    horario_atendimento JSONB,
    
    -- Webhooks
    webhook_url VARCHAR(500),
    webhook_verificado BOOLEAN DEFAULT false,
    
    -- Métricas
    total_mensagens_enviadas INTEGER DEFAULT 0,
    total_mensagens_recebidas INTEGER DEFAULT 0,
    total_conversas INTEGER DEFAULT 0,
    
    -- Metadados
    ultima_sincronizacao_em TIMESTAMP WITH TIME ZONE,
    conectada_em TIMESTAMP WITH TIME ZONE,
    desconectada_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID NOT NULL
);

CREATE INDEX idx_whatsapp_contas_numero ON whatsapp_contas(numero_whatsapp) WHERE excluido_em IS NULL;
CREATE INDEX idx_whatsapp_contas_status ON whatsapp_contas(status) WHERE excluido_em IS NULL;

COMMENT ON TABLE whatsapp_contas IS 'Contas WhatsApp Business conectadas ao CRM';

-- =====================================================
-- 2. CONTATOS WHATSAPP
-- =====================================================

CREATE TABLE whatsapp_contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contato_id UUID NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
    whatsapp_conta_id UUID NOT NULL REFERENCES whatsapp_contas(id),
    
    -- Identificação WhatsApp
    numero_whatsapp VARCHAR(20) NOT NULL,
    whatsapp_id VARCHAR(255),
    nome_whatsapp VARCHAR(255),
    
    -- Informações do perfil
    foto_perfil_url VARCHAR(500),
    status_whatsapp TEXT,
    sobre TEXT,
    
    -- Preferências e configurações
    opt_in BOOLEAN DEFAULT false,
    opt_in_data TIMESTAMP WITH TIME ZONE,
    opt_out BOOLEAN DEFAULT false,
    opt_out_data TIMESTAMP WITH TIME ZONE,
    motivo_opt_out TEXT,
    
    bloqueado BOOLEAN DEFAULT false,
    bloqueado_em TIMESTAMP WITH TIME ZONE,
    motivo_bloqueio TEXT,
    
    -- Tags e categorias
    tags TEXT[],
    categoria_cliente VARCHAR(50),
    
    -- Status do número
    numero_valido BOOLEAN DEFAULT true,
    ultima_verificacao_em TIMESTAMP WITH TIME ZONE,
    tem_whatsapp BOOLEAN DEFAULT true,
    
    -- Métricas de engajamento
    total_mensagens_enviadas INTEGER DEFAULT 0,
    total_mensagens_recebidas INTEGER DEFAULT 0,
    total_conversas INTEGER DEFAULT 0,
    taxa_resposta DECIMAL(5,2) DEFAULT 0,
    tempo_medio_resposta_minutos INTEGER,
    
    ultima_mensagem_em TIMESTAMP WITH TIME ZONE,
    ultima_mensagem_enviada_em TIMESTAMP WITH TIME ZONE,
    ultima_mensagem_recebida_em TIMESTAMP WITH TIME ZONE,
    ultima_visualizacao_em TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(contato_id, whatsapp_conta_id)
);

CREATE INDEX idx_whatsapp_contatos_numero ON whatsapp_contatos(numero_whatsapp);
CREATE INDEX idx_whatsapp_contatos_contato ON whatsapp_contatos(contato_id);
CREATE INDEX idx_whatsapp_contatos_conta ON whatsapp_contatos(whatsapp_conta_id);
CREATE INDEX idx_whatsapp_contatos_opt_in ON whatsapp_contatos(opt_in) WHERE opt_out = false;

COMMENT ON TABLE whatsapp_contatos IS 'Perfis WhatsApp vinculados aos contatos do CRM';

-- =====================================================
-- 3. CONVERSAS/SESSÕES
-- =====================================================

CREATE TABLE whatsapp_conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID NOT NULL REFERENCES whatsapp_contas(id),
    whatsapp_contato_id UUID NOT NULL REFERENCES whatsapp_contatos(id),
    
    -- Relacionamentos CRM
    contato_id UUID REFERENCES contatos(id),
    conta_id UUID REFERENCES contas(id),
    oportunidade_id UUID REFERENCES oportunidades(id),
    
    -- Identificação
    conversa_externa_id VARCHAR(255),
    titulo VARCHAR(255),
    
    -- Status da conversa
    status VARCHAR(50) DEFAULT 'aberta' CHECK (status IN ('aberta', 'aguardando', 'resolvida', 'fechada', 'spam')),
    prioridade VARCHAR(50) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    
    -- Atribuição
    atribuida_para_id UUID,
    atribuida_em TIMESTAMP WITH TIME ZONE,
    atribuicao_automatica BOOLEAN DEFAULT true,
    
    -- Tipo de conversa
    tipo_conversa VARCHAR(50),
    origem VARCHAR(50),
    categoria VARCHAR(100),
    
    -- Janela de 24h do WhatsApp
    janela_24h_ativa BOOLEAN DEFAULT false,
    janela_aberta_em TIMESTAMP WITH TIME ZONE,
    janela_fecha_em TIMESTAMP WITH TIME ZONE,
    
    -- Bot e automação
    gerenciada_por_bot BOOLEAN DEFAULT false,
    transferida_para_humano BOOLEAN DEFAULT false,
    transferida_em TIMESTAMP WITH TIME ZONE,
    
    -- Métricas
    total_mensagens INTEGER DEFAULT 0,
    total_mensagens_enviadas INTEGER DEFAULT 0,
    total_mensagens_recebidas INTEGER DEFAULT 0,
    tempo_primeira_resposta_minutos INTEGER,
    tempo_total_resposta_minutos INTEGER,
    
    -- Satisfação
    avaliacao_satisfacao INTEGER CHECK (avaliacao_satisfacao >= 1 AND avaliacao_satisfacao <= 5),
    comentario_avaliacao TEXT,
    avaliada_em TIMESTAMP WITH TIME ZONE,
    
    -- Tags
    tags TEXT[],
    
    -- Timestamps
    iniciada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ultima_mensagem_em TIMESTAMP WITH TIME ZONE,
    ultima_interacao_agente_em TIMESTAMP WITH TIME ZONE,
    ultima_interacao_cliente_em TIMESTAMP WITH TIME ZONE,
    resolvida_em TIMESTAMP WITH TIME ZONE,
    fechada_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_whatsapp_conversas_conta ON whatsapp_conversas(whatsapp_conta_id);
CREATE INDEX idx_whatsapp_conversas_contato ON whatsapp_conversas(whatsapp_contato_id);
CREATE INDEX idx_whatsapp_conversas_status ON whatsapp_conversas(status, atribuida_para_id);
CREATE INDEX idx_whatsapp_conversas_janela ON whatsapp_conversas(janela_24h_ativa, janela_fecha_em);
CREATE INDEX idx_whatsapp_conversas_oportunidade ON whatsapp_conversas(oportunidade_id);

COMMENT ON TABLE whatsapp_conversas IS 'Conversas/sessões do WhatsApp com clientes';
COMMENT ON COLUMN whatsapp_conversas.janela_24h_ativa IS 'Janela de 24h do WhatsApp Business para enviar mensagens sem template';

-- =====================================================
-- 4. MENSAGENS
-- =====================================================

CREATE TABLE whatsapp_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
    whatsapp_conta_id UUID NOT NULL REFERENCES whatsapp_contas(id),
    whatsapp_contato_id UUID NOT NULL REFERENCES whatsapp_contatos(id),
    
    -- Identificação externa
    mensagem_externa_id VARCHAR(255) UNIQUE,
    mensagem_referencia_id VARCHAR(255),
    
    -- Direção e tipo
    direcao VARCHAR(10) NOT NULL CHECK (direcao IN ('enviada', 'recebida')),
    tipo_mensagem VARCHAR(50) NOT NULL DEFAULT 'texto' CHECK (tipo_mensagem IN (
        'texto', 'imagem', 'video', 'audio', 'documento', 
        'localizacao', 'contato', 'template', 'botao', 
        'lista', 'sticker', 'reacao'
    )),
    
    -- Conteúdo
    corpo TEXT,
    corpo_original TEXT,
    
    -- Mídia
    tem_midia BOOLEAN DEFAULT false,
    tipo_midia VARCHAR(50),
    url_midia VARCHAR(500),
    tamanho_midia INTEGER,
    nome_arquivo VARCHAR(255),
    mime_type VARCHAR(100),
    duracao_midia_segundos INTEGER,
    
    -- Template
    eh_template BOOLEAN DEFAULT false,
    template_id UUID,
    template_nome VARCHAR(150),
    template_parametros JSONB,
    
    -- Botões e listas interativas
    tem_botoes BOOLEAN DEFAULT false,
    botoes JSONB,
    resposta_botao VARCHAR(255),
    eh_lista BOOLEAN DEFAULT false,
    lista_opcoes JSONB,
    resposta_lista VARCHAR(255),
    
    -- Localização
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco_localizacao TEXT,
    
    -- Status de entrega
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'entregue', 'lida', 'falhou')),
    status_enviada_em TIMESTAMP WITH TIME ZONE,
    status_entregue_em TIMESTAMP WITH TIME ZONE,
    status_lida_em TIMESTAMP WITH TIME ZONE,
    status_falhou_em TIMESTAMP WITH TIME ZONE,
    
    erro_codigo VARCHAR(50),
    erro_mensagem TEXT,
    tentativas_envio INTEGER DEFAULT 0,
    
    -- Contexto
    contexto JSONB,
    metadata JSONB,
    
    -- Remetente/Destinatário
    numero_de VARCHAR(20),
    numero_para VARCHAR(20),
    nome_remetente VARCHAR(255),
    
    -- Automação
    enviada_por_bot BOOLEAN DEFAULT false,
    enviada_automaticamente BOOLEAN DEFAULT false,
    
    -- Usuário que enviou
    enviada_por_usuario_id UUID,
    
    -- Análise de IA
    sentimento VARCHAR(50) CHECK (sentimento IN ('positivo', 'neutro', 'negativo')),
    intencao VARCHAR(100),
    confianca_analise DECIMAL(5,2),
    palavras_chave TEXT[],
    idioma_detectado VARCHAR(10),
    foi_analisada BOOLEAN DEFAULT false,
    
    -- Custos
    custo_envio DECIMAL(10,4),
    
    -- Timestamps
    agendada_para TIMESTAMP WITH TIME ZONE,
    enviada_em TIMESTAMP WITH TIME ZONE,
    recebida_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_whatsapp_mensagens_conversa ON whatsapp_mensagens(conversa_id, criado_em DESC);
CREATE INDEX idx_whatsapp_mensagens_conta ON whatsapp_mensagens(whatsapp_conta_id, criado_em DESC);
CREATE INDEX idx_whatsapp_mensagens_contato ON whatsapp_mensagens(whatsapp_contato_id, criado_em DESC);
CREATE INDEX idx_whatsapp_mensagens_status ON whatsapp_mensagens(status, direcao);
CREATE INDEX idx_whatsapp_mensagens_externa_id ON whatsapp_mensagens(mensagem_externa_id);
CREATE INDEX idx_whatsapp_mensagens_agendadas ON whatsapp_mensagens(agendada_para) 
    WHERE agendada_para IS NOT NULL AND status = 'pendente';

-- Busca full-text no corpo das mensagens
CREATE INDEX idx_whatsapp_mensagens_busca ON whatsapp_mensagens 
    USING gin(to_tsvector('portuguese', corpo));

COMMENT ON TABLE whatsapp_mensagens IS 'Mensagens individuais enviadas e recebidas via WhatsApp';
COMMENT ON COLUMN whatsapp_mensagens.direcao IS 'Direção da mensagem: enviada (empresa→cliente) ou recebida (cliente→empresa)';

-- =====================================================
-- 5. TEMPLATES DE MENSAGEM
-- =====================================================

CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID NOT NULL REFERENCES whatsapp_contas(id),
    
    -- Identificação
    nome_template VARCHAR(150) NOT NULL,
    template_externo_id VARCHAR(255),
    
    -- Categoria
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('marketing', 'utility', 'authentication')),
    subcategoria VARCHAR(100),
    
    -- Idioma
    idioma VARCHAR(10) DEFAULT 'pt_BR',
    
    -- Conteúdo
    titulo VARCHAR(255),
    corpo TEXT NOT NULL,
    rodape VARCHAR(255),
    
    -- Botões
    tem_botoes BOOLEAN DEFAULT false,
    botoes JSONB,
    
    -- Variáveis/Parâmetros
    parametros JSONB,
    numero_parametros INTEGER DEFAULT 0,
    
    -- Mídia (header)
    tipo_midia_header VARCHAR(50),
    url_midia_exemplo VARCHAR(500),
    
    -- Status de aprovação
    status_aprovacao VARCHAR(50) DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado')),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    rejeitado_em TIMESTAMP WITH TIME ZONE,
    motivo_rejeicao TEXT,
    
    -- Uso e métricas
    total_enviados INTEGER DEFAULT 0,
    total_entregues INTEGER DEFAULT 0,
    total_lidos INTEGER DEFAULT 0,
    total_respondidos INTEGER DEFAULT 0,
    taxa_conversao DECIMAL(5,2) DEFAULT 0,
    
    ultimo_envio_em TIMESTAMP WITH TIME ZONE,
    
    -- Configurações
    ativo BOOLEAN DEFAULT true,
    permite_personalizar BOOLEAN DEFAULT true,
    requer_aprovacao_envio BOOLEAN DEFAULT false,
    
    -- Tags
    tags TEXT[],
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID NOT NULL,
    
    UNIQUE(whatsapp_conta_id, nome_template)
);

CREATE INDEX idx_whatsapp_templates_conta ON whatsapp_templates(whatsapp_conta_id) WHERE excluido_em IS NULL;
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(status_aprovacao, ativo);
CREATE INDEX idx_whatsapp_templates_categoria ON whatsapp_templates(categoria);

COMMENT ON TABLE whatsapp_templates IS 'Templates de mensagem aprovados pelo WhatsApp Business';
COMMENT ON COLUMN whatsapp_templates.categoria IS 'Categoria obrigatória do WhatsApp: marketing, utility ou authentication';

-- =====================================================
-- 6. RESPOSTAS RÁPIDAS
-- =====================================================

CREATE TABLE whatsapp_respostas_rapidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID REFERENCES whatsapp_contas(id),
    
    -- Identificação
    atalho VARCHAR(50) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    
    -- Conteúdo
    mensagem TEXT NOT NULL,
    tem_midia BOOLEAN DEFAULT false,
    url_midia VARCHAR(500),
    tipo_midia VARCHAR(50),
    
    -- Categorização
    categoria VARCHAR(100),
    tags TEXT[],
    
    -- Configuração
    ativa BOOLEAN DEFAULT true,
    privada BOOLEAN DEFAULT false,
    compartilhada_equipe BOOLEAN DEFAULT true,
    
    -- Métricas
    total_usos INTEGER DEFAULT 0,
    ultima_utilizacao_em TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    excluido_em TIMESTAMP WITH TIME ZONE NULL,
    criado_por UUID NOT NULL,
    
    UNIQUE(whatsapp_conta_id, atalho)
);

CREATE INDEX idx_whatsapp_respostas_conta ON whatsapp_respostas_rapidas(whatsapp_conta_id, ativa);
CREATE INDEX idx_whatsapp_respostas_atalho ON whatsapp_respostas_rapidas(atalho) WHERE excluido_em IS NULL;

COMMENT ON TABLE whatsapp_respostas_rapidas IS 'Respostas rápidas pré-definidas para atendimento';

-- =====================================================
-- 7. WEBHOOKS E EVENTOS
-- =====================================================

CREATE TABLE whatsapp_webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conta_id UUID REFERENCES whatsapp_contas(id),
    
    -- Webhook
    provider VARCHAR(50) NOT NULL,
    tipo_evento VARCHAR(100) NOT NULL,
    evento_externo_id VARCHAR(255),
    
    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processamento
    processado BOOLEAN DEFAULT false,
    processado_em TIMESTAMP WITH TIME ZONE,
    erro_processamento TEXT,
    tentativas_processamento INTEGER DEFAULT 0,
    
    -- Resultado
    mensagem_id UUID REFERENCES whatsapp_mensagens(id),
    conversa_id UUID REFERENCES whatsapp_conversas(id),
    
    recebido_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_whatsapp_webhooks_conta ON whatsapp_webhooks_log(whatsapp_conta_id, recebido_em DESC);
CREATE INDEX idx_whatsapp_webhooks_processado ON whatsapp_webhooks_log(processado, recebido_em);
CREATE INDEX idx_whatsapp_webhooks_tipo ON whatsapp_webhooks_log(tipo_evento);

COMMENT ON TABLE whatsapp_webhooks_log IS 'Log de todos os webhooks recebidos dos providers WhatsApp';

-- =====================================================
-- 8. TRIGGERS E FUNÇÕES
-- =====================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_whatsapp_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- Aplicar triggers de timestamp
CREATE TRIGGER update_whatsapp_contas_timestamp 
    BEFORE UPDATE ON whatsapp_contas
    FOR EACH ROW EXECUTE FUNCTION atualizar_whatsapp_timestamp();

CREATE TRIGGER update_whatsapp_contatos_timestamp 
    BEFORE UPDATE ON whatsapp_contatos
    FOR EACH ROW EXECUTE FUNCTION atualizar_whatsapp_timestamp();

CREATE TRIGGER update_whatsapp_conversas_timestamp 
    BEFORE UPDATE ON whatsapp_conversas
    FOR EACH ROW EXECUTE FUNCTION atualizar_whatsapp_timestamp();

-- Função para atualizar métricas do contato WhatsApp
CREATE OR REPLACE FUNCTION atualizar_metricas_whatsapp_contato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER trigger_atualizar_metricas_contato
    AFTER INSERT ON whatsapp_mensagens
    FOR EACH ROW EXECUTE FUNCTION atualizar_metricas_whatsapp_contato();

-- Função para atualizar conversa com última mensagem
CREATE OR REPLACE FUNCTION atualizar_conversa_ultima_mensagem()
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
    AFTER INSERT ON whatsapp_mensagens
    FOR EACH ROW EXECUTE FUNCTION atualizar_conversa_ultima_mensagem();

-- Função para verificar janela de 24h
CREATE OR REPLACE FUNCTION verificar_janela_24h()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se mensagem recebida, abre janela de 24h
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
    AFTER INSERT ON whatsapp_mensagens
    FOR EACH ROW EXECUTE FUNCTION verificar_janela_24h();

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE whatsapp_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_respostas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhooks_log ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_contas
CREATE POLICY "Admins e Managers podem gerenciar contas WhatsApp"
    ON whatsapp_contas FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales podem visualizar contas WhatsApp"
    ON whatsapp_contas FOR SELECT
    USING (has_role(auth.uid(), 'sales'::app_role) AND excluido_em IS NULL);

-- Policies para whatsapp_contatos
CREATE POLICY "Usuários podem visualizar contatos WhatsApp"
    ON whatsapp_contatos FOR SELECT
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Admins e Managers podem gerenciar contatos WhatsApp"
    ON whatsapp_contatos FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policies para whatsapp_conversas
CREATE POLICY "Usuários podem visualizar conversas WhatsApp"
    ON whatsapp_conversas FOR SELECT
    USING (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
        OR atribuida_para_id = auth.uid()
    );

CREATE POLICY "Usuários podem gerenciar suas conversas"
    ON whatsapp_conversas FOR ALL
    USING (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
        OR atribuida_para_id = auth.uid()
    )
    WITH CHECK (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
        OR atribuida_para_id = auth.uid()
    );

-- Policies para whatsapp_mensagens
CREATE POLICY "Usuários podem visualizar mensagens"
    ON whatsapp_mensagens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM whatsapp_conversas wc
            WHERE wc.id = whatsapp_mensagens.conversa_id
            AND (
                has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
                OR wc.atribuida_para_id = auth.uid()
            )
        )
    );

CREATE POLICY "Usuários podem criar mensagens"
    ON whatsapp_mensagens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whatsapp_conversas wc
            WHERE wc.id = whatsapp_mensagens.conversa_id
            AND (
                has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
                OR wc.atribuida_para_id = auth.uid()
            )
        )
    );

-- Policies para whatsapp_templates
CREATE POLICY "Admins e Managers podem gerenciar templates"
    ON whatsapp_templates FOR ALL
    USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Usuários podem visualizar templates aprovados"
    ON whatsapp_templates FOR SELECT
    USING (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
        AND status_aprovacao = 'aprovado'
        AND ativo = true
        AND excluido_em IS NULL
    );

-- Policies para whatsapp_respostas_rapidas
CREATE POLICY "Usuários podem visualizar respostas rápidas"
    ON whatsapp_respostas_rapidas FOR SELECT
    USING (
        (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]))
        AND (privada = false OR criado_por = auth.uid())
        AND excluido_em IS NULL
    );

CREATE POLICY "Usuários podem criar respostas rápidas"
    ON whatsapp_respostas_rapidas FOR INSERT
    WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Usuários podem atualizar suas respostas rápidas"
    ON whatsapp_respostas_rapidas FOR UPDATE
    USING (criado_por = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policies para whatsapp_webhooks_log
CREATE POLICY "Admins podem visualizar webhooks log"
    ON whatsapp_webhooks_log FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));