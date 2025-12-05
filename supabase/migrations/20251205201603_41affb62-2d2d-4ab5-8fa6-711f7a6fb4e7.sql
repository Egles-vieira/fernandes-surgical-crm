
-- =====================================================
-- MÓDULO DE ATIVIDADES INTELIGENTE - FASE 1
-- Infraestrutura de Dados Completa
-- =====================================================

-- 1. CRIAR ENUMs
-- =====================================================

-- Tipo de atividade
DO $$ BEGIN
  CREATE TYPE tipo_atividade AS ENUM (
    'tarefa',
    'chamada',
    'reuniao',
    'email',
    'whatsapp',
    'visita',
    'follow_up',
    'proposta',
    'negociacao',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status da atividade
DO $$ BEGIN
  CREATE TYPE status_atividade AS ENUM (
    'pendente',
    'em_andamento',
    'concluida',
    'cancelada',
    'reagendada',
    'aguardando_resposta'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Prioridade da atividade
DO $$ BEGIN
  CREATE TYPE prioridade_atividade AS ENUM (
    'critica',
    'alta',
    'media',
    'baixa'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de sentimento (NLP)
DO $$ BEGIN
  CREATE TYPE sentimento_tipo AS ENUM (
    'muito_positivo',
    'positivo',
    'neutro',
    'negativo',
    'muito_negativo'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de entidade WHO (quem)
DO $$ BEGIN
  CREATE TYPE who_tipo AS ENUM (
    'lead',
    'contato',
    'cliente'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de entidade WHAT (sobre o quê)
DO $$ BEGIN
  CREATE TYPE what_tipo AS ENUM (
    'venda',
    'oportunidade',
    'conta',
    'ticket',
    'proposta'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE CÓDIGOS DE DISPOSIÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.codigos_disposicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_atividade tipo_atividade,
  cor VARCHAR(7) DEFAULT '#6B7280',
  icone VARCHAR(50) DEFAULT 'Circle',
  
  -- Regras de validação
  requer_proximo_passo BOOLEAN DEFAULT false,
  marca_como_concluido BOOLEAN DEFAULT true,
  requer_agendamento BOOLEAN DEFAULT false,
  dias_follow_up_padrao INTEGER,
  
  -- Configuração NBA
  sugestao_nba_padrao VARCHAR(100),
  
  -- Controle
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir códigos de disposição padrão
INSERT INTO public.codigos_disposicao (codigo, nome, tipo_atividade, cor, icone, requer_proximo_passo, marca_como_concluido, sugestao_nba_padrao, ordem) VALUES
  ('CONECTADO', 'Conectado com Sucesso', 'chamada', '#10B981', 'PhoneCall', true, true, 'agendar_reuniao', 1),
  ('NAO_ATENDEU', 'Não Atendeu', 'chamada', '#F59E0B', 'PhoneMissed', true, false, 'tentar_novamente', 2),
  ('OCUPADO', 'Ocupado/Callback', 'chamada', '#6366F1', 'Clock', true, false, 'reagendar_chamada', 3),
  ('NUMERO_ERRADO', 'Número Errado', 'chamada', '#EF4444', 'PhoneOff', false, true, 'atualizar_contato', 4),
  ('CAIXA_POSTAL', 'Caixa Postal', 'chamada', '#8B5CF6', 'Voicemail', true, false, 'enviar_email', 5),
  ('REUNIAO_REALIZADA', 'Reunião Realizada', 'reuniao', '#10B981', 'Users', true, true, 'enviar_proposta', 6),
  ('REUNIAO_CANCELADA', 'Reunião Cancelada', 'reuniao', '#EF4444', 'CalendarX', true, false, 'reagendar_reuniao', 7),
  ('REUNIAO_NO_SHOW', 'No-Show', 'reuniao', '#F59E0B', 'UserX', true, false, 'follow_up_email', 8),
  ('EMAIL_ENVIADO', 'Email Enviado', 'email', '#3B82F6', 'Mail', false, true, 'aguardar_resposta', 9),
  ('EMAIL_RESPONDIDO', 'Email Respondido', 'email', '#10B981', 'MailCheck', true, true, 'analisar_resposta', 10),
  ('PROPOSTA_ENVIADA', 'Proposta Enviada', 'proposta', '#8B5CF6', 'FileText', true, true, 'follow_up_proposta', 11),
  ('PROPOSTA_ACEITA', 'Proposta Aceita', 'proposta', '#10B981', 'CheckCircle', false, true, 'iniciar_onboarding', 12),
  ('PROPOSTA_RECUSADA', 'Proposta Recusada', 'proposta', '#EF4444', 'XCircle', true, true, 'analisar_objecoes', 13),
  ('NEGOCIACAO_ANDAMENTO', 'Em Negociação', 'negociacao', '#F59E0B', 'Handshake', true, false, 'preparar_contraproposta', 14),
  ('VISITA_REALIZADA', 'Visita Realizada', 'visita', '#10B981', 'MapPin', true, true, 'enviar_resumo', 15),
  ('WHATSAPP_ENVIADO', 'WhatsApp Enviado', 'whatsapp', '#25D366', 'MessageCircle', false, true, 'aguardar_resposta', 16),
  ('WHATSAPP_RESPONDIDO', 'WhatsApp Respondido', 'whatsapp', '#25D366', 'MessageSquare', true, true, 'continuar_conversa', 17),
  ('TAREFA_CONCLUIDA', 'Tarefa Concluída', 'tarefa', '#10B981', 'CheckSquare', false, true, NULL, 18),
  ('FOLLOW_UP_FEITO', 'Follow-up Realizado', 'follow_up', '#3B82F6', 'RefreshCw', true, true, 'proximo_passo', 19),
  ('SEM_INTERESSE', 'Sem Interesse', NULL, '#6B7280', 'ThumbsDown', false, true, 'nurturing', 20)
ON CONFLICT (codigo) DO NOTHING;

-- 3. TABELA PRINCIPAL DE ATIVIDADES (Polimórfica)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_atividade VARCHAR(20) UNIQUE,
  
  -- Campos básicos
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo tipo_atividade NOT NULL DEFAULT 'tarefa',
  status status_atividade NOT NULL DEFAULT 'pendente',
  prioridade prioridade_atividade NOT NULL DEFAULT 'media',
  
  -- Polimorfismo WHO (Quem é o contato/lead relacionado)
  who_id UUID,
  who_tipo who_tipo,
  
  -- Polimorfismo WHAT (Qual é a entidade relacionada)
  what_id UUID,
  what_tipo what_tipo,
  
  -- Relacionamentos diretos (para consultas otimizadas)
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  
  -- Responsabilidade
  responsavel_id UUID REFERENCES public.perfis_usuario(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES public.perfis_usuario(id) ON DELETE SET NULL,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
  
  -- Datas e prazos
  data_vencimento TIMESTAMP WITH TIME ZONE,
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  duracao_estimada_minutos INTEGER,
  duracao_real_minutos INTEGER,
  
  -- Resultado/Disposição (OBRIGATÓRIO para conclusão)
  codigo_disposicao_id UUID REFERENCES public.codigos_disposicao(id),
  resultado_descricao TEXT,
  
  -- Análise de Sentimento (NLP)
  sentimento_score DECIMAL(3,2) CHECK (sentimento_score >= -1 AND sentimento_score <= 1),
  sentimento_tipo sentimento_tipo,
  sentimento_analise_em TIMESTAMP WITH TIME ZONE,
  
  -- Próximo Passo (OBRIGATÓRIO quando disposição requer)
  proximo_passo TEXT,
  proximo_passo_obrigatorio BOOLEAN DEFAULT false,
  proxima_atividade_id UUID REFERENCES public.atividades(id),
  
  -- Priorização Algorítmica
  score_prioridade DECIMAL(10,4) DEFAULT 0,
  score_lead_fit DECIMAL(5,2) DEFAULT 50,
  score_engajamento DECIMAL(5,2) DEFAULT 50,
  score_decaimento_temporal DECIMAL(5,2) DEFAULT 0,
  score_urgencia DECIMAL(5,2) DEFAULT 0,
  score_valor_potencial DECIMAL(15,2) DEFAULT 0,
  score_calculado_em TIMESTAMP WITH TIME ZONE,
  
  -- Next Best Action (NBA)
  nba_sugestao_tipo VARCHAR(100),
  nba_sugestao_descricao TEXT,
  nba_confianca DECIMAL(3,2),
  nba_aceita BOOLEAN,
  nba_motivo_rejeicao TEXT,
  
  -- Integração com canais
  whatsapp_mensagem_id UUID,
  email_message_id VARCHAR(255),
  chamada_id UUID,
  reuniao_externa_id VARCHAR(255),
  
  -- Recorrência
  eh_recorrente BOOLEAN DEFAULT false,
  regra_recorrencia JSONB,
  atividade_pai_id UUID REFERENCES public.atividades(id),
  
  -- Lembretes
  lembrete_em TIMESTAMP WITH TIME ZONE,
  lembrete_enviado BOOLEAN DEFAULT false,
  
  -- Metadados
  tags TEXT[] DEFAULT '{}',
  campos_customizados JSONB DEFAULT '{}',
  
  -- Controle
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  excluido_em TIMESTAMP WITH TIME ZONE
);

-- 4. TABELA DE REGRAS NBA (Next Best Action)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nba_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  
  -- Condições de ativação (antecedente)
  condicao_tipo_atividade tipo_atividade,
  condicao_codigo_disposicao VARCHAR(50),
  condicao_etapa_pipeline VARCHAR(50),
  condicao_sentimento sentimento_tipo,
  condicao_dias_sem_contato INTEGER,
  condicao_valor_minimo DECIMAL(15,2),
  condicoes_extras JSONB,
  
  -- Ação sugerida (consequente)
  acao_tipo tipo_atividade NOT NULL,
  acao_titulo_template VARCHAR(255),
  acao_descricao_template TEXT,
  acao_prazo_dias INTEGER DEFAULT 1,
  acao_prioridade prioridade_atividade DEFAULT 'media',
  
  -- Métricas
  confianca DECIMAL(3,2) DEFAULT 0.5,
  suporte INTEGER DEFAULT 0,
  vezes_sugerida INTEGER DEFAULT 0,
  vezes_aceita INTEGER DEFAULT 0,
  
  -- Controle
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir regras NBA padrão
INSERT INTO public.nba_regras (nome, condicao_tipo_atividade, condicao_codigo_disposicao, acao_tipo, acao_titulo_template, acao_prazo_dias, confianca, ordem) VALUES
  ('Após Conexão -> Agendar Reunião', 'chamada', 'CONECTADO', 'reuniao', 'Agendar reunião com {cliente}', 2, 0.85, 1),
  ('Após Não Atender -> Tentar Novamente', 'chamada', 'NAO_ATENDEU', 'chamada', 'Tentar contato novamente com {cliente}', 1, 0.90, 2),
  ('Após Caixa Postal -> Enviar Email', 'chamada', 'CAIXA_POSTAL', 'email', 'Enviar email para {cliente}', 0, 0.75, 3),
  ('Após Reunião -> Enviar Proposta', 'reuniao', 'REUNIAO_REALIZADA', 'proposta', 'Preparar e enviar proposta para {cliente}', 1, 0.80, 4),
  ('Após No-Show -> Follow-up Email', 'reuniao', 'REUNIAO_NO_SHOW', 'email', 'Follow-up por email após no-show de {cliente}', 0, 0.85, 5),
  ('Após Proposta Enviada -> Follow-up', 'proposta', 'PROPOSTA_ENVIADA', 'follow_up', 'Follow-up sobre proposta com {cliente}', 3, 0.75, 6),
  ('Após Proposta Recusada -> Analisar', 'proposta', 'PROPOSTA_RECUSADA', 'tarefa', 'Analisar objeções de {cliente}', 1, 0.70, 7),
  ('Após WhatsApp Respondido -> Continuar', 'whatsapp', 'WHATSAPP_RESPONDIDO', 'whatsapp', 'Continuar conversa com {cliente}', 0, 0.80, 8)
ON CONFLICT DO NOTHING;

-- 5. TABELA DE HISTÓRICO DE ATIVIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.atividades_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  
  campo_alterado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  
  alterado_por UUID REFERENCES public.perfis_usuario(id),
  alterado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  ip_address INET,
  user_agent TEXT
);

-- 6. TABELA DE HISTÓRICO NBA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nba_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  atividade_origem_id UUID REFERENCES public.atividades(id) ON DELETE SET NULL,
  atividade_sugerida_id UUID REFERENCES public.atividades(id) ON DELETE SET NULL,
  regra_id UUID REFERENCES public.nba_regras(id) ON DELETE SET NULL,
  
  sugestao_tipo tipo_atividade NOT NULL,
  sugestao_titulo VARCHAR(255),
  sugestao_descricao TEXT,
  confianca DECIMAL(3,2),
  
  aceita BOOLEAN,
  motivo_rejeicao TEXT,
  
  usuario_id UUID REFERENCES public.perfis_usuario(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  respondido_em TIMESTAMP WITH TIME ZONE
);

-- 7. TABELA DE PARTICIPANTES DE ATIVIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.atividades_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.perfis_usuario(id) ON DELETE CASCADE,
  
  papel VARCHAR(50) DEFAULT 'participante',
  confirmado BOOLEAN DEFAULT false,
  confirmado_em TIMESTAMP WITH TIME ZONE,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(atividade_id, usuario_id)
);

-- 8. TABELA DE COMENTÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.atividades_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  
  conteudo TEXT NOT NULL,
  autor_id UUID NOT NULL REFERENCES public.perfis_usuario(id),
  
  mencoes UUID[] DEFAULT '{}',
  anexos JSONB DEFAULT '[]',
  
  editado BOOLEAN DEFAULT false,
  editado_em TIMESTAMP WITH TIME ZONE,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  excluido_em TIMESTAMP WITH TIME ZONE
);

-- 9. ÍNDICES OTIMIZADOS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_atividades_responsavel ON public.atividades(responsavel_id) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_equipe ON public.atividades(equipe_id) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_status ON public.atividades(status) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_tipo ON public.atividades(tipo) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_vencimento ON public.atividades(data_vencimento) WHERE excluido_em IS NULL AND status IN ('pendente', 'em_andamento');
CREATE INDEX IF NOT EXISTS idx_atividades_score ON public.atividades(score_prioridade DESC) WHERE excluido_em IS NULL AND status IN ('pendente', 'em_andamento');
CREATE INDEX IF NOT EXISTS idx_atividades_cliente ON public.atividades(cliente_id) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_venda ON public.atividades(venda_id) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_who ON public.atividades(who_id, who_tipo) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_what ON public.atividades(what_id, what_tipo) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_numero ON public.atividades(numero_atividade);
CREATE INDEX IF NOT EXISTS idx_atividades_historico_atividade ON public.atividades_historico(atividade_id);
CREATE INDEX IF NOT EXISTS idx_nba_historico_origem ON public.nba_historico(atividade_origem_id);
CREATE INDEX IF NOT EXISTS idx_atividades_comentarios_atividade ON public.atividades_comentarios(atividade_id) WHERE excluido_em IS NULL;

-- 10. MATERIALIZED VIEW PARA PRIORIZAÇÃO
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_atividades_prioridade AS
SELECT 
  a.id,
  a.numero_atividade,
  a.titulo,
  a.tipo,
  a.status,
  a.prioridade,
  a.responsavel_id,
  a.equipe_id,
  a.cliente_id,
  a.venda_id,
  a.data_vencimento,
  a.score_lead_fit,
  a.score_engajamento,
  
  -- Cálculo do decaimento temporal (aumenta conforme se aproxima do vencimento)
  CASE 
    WHEN a.data_vencimento IS NULL THEN 0
    WHEN a.data_vencimento < now() THEN 100 -- Atrasada = máximo
    ELSE GREATEST(0, 100 - EXTRACT(EPOCH FROM (a.data_vencimento - now())) / 3600)
  END AS score_decaimento_calculado,
  
  -- Score de urgência baseado na prioridade
  CASE a.prioridade
    WHEN 'critica' THEN 100
    WHEN 'alta' THEN 75
    WHEN 'media' THEN 50
    WHEN 'baixa' THEN 25
  END AS score_urgencia_calculado,
  
  -- Score final calculado
  (
    COALESCE(a.score_lead_fit, 50) * COALESCE(a.score_engajamento, 50) / 100
    - CASE 
        WHEN a.data_vencimento IS NULL THEN 0
        WHEN a.data_vencimento < now() THEN -100
        ELSE GREATEST(0, 100 - EXTRACT(EPOCH FROM (a.data_vencimento - now())) / 3600)
      END
    + CASE a.prioridade
        WHEN 'critica' THEN 100
        WHEN 'alta' THEN 75
        WHEN 'media' THEN 50
        WHEN 'baixa' THEN 25
      END
    + COALESCE(a.score_valor_potencial, 0) / 10000
  ) AS score_calculado,
  
  -- Dados do cliente para exibição
  c.nome_abrev AS cliente_nome,
  
  -- Dados do responsável
  p.primeiro_nome || ' ' || p.sobrenome AS responsavel_nome,
  
  now() AS calculado_em

FROM public.atividades a
LEFT JOIN public.clientes c ON a.cliente_id = c.id
LEFT JOIN public.perfis_usuario p ON a.responsavel_id = p.id
WHERE a.excluido_em IS NULL
  AND a.status IN ('pendente', 'em_andamento', 'aguardando_resposta');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_atividades_prioridade_id ON public.mv_atividades_prioridade(id);

-- 11. FUNÇÕES
-- =====================================================

-- Função para gerar número da atividade
CREATE OR REPLACE FUNCTION public.gerar_numero_atividade()
RETURNS TRIGGER AS $$
DECLARE
  ano TEXT;
  mes TEXT;
  contador INTEGER;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YY');
  mes := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_atividade FROM 6) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.atividades
  WHERE numero_atividade LIKE 'AT' || ano || mes || '%';
  
  NEW.numero_atividade := 'AT' || ano || mes || LPAD(contador::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para validar conclusão de atividade
CREATE OR REPLACE FUNCTION public.validar_conclusao_atividade()
RETURNS TRIGGER AS $$
DECLARE
  disposicao_requer_proximo BOOLEAN;
BEGIN
  -- Só valida quando status muda para 'concluida'
  IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
    
    -- Verificar se tem código de disposição
    IF NEW.codigo_disposicao_id IS NULL THEN
      RAISE EXCEPTION 'Não é possível concluir a atividade sem um código de disposição';
    END IF;
    
    -- Verificar se o código de disposição requer próximo passo
    SELECT requer_proximo_passo INTO disposicao_requer_proximo
    FROM public.codigos_disposicao
    WHERE id = NEW.codigo_disposicao_id;
    
    IF disposicao_requer_proximo AND (NEW.proximo_passo IS NULL OR TRIM(NEW.proximo_passo) = '') THEN
      RAISE EXCEPTION 'Este código de disposição requer a definição de um próximo passo';
    END IF;
    
    -- Registrar data de conclusão
    NEW.data_conclusao := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para registrar histórico
CREATE OR REPLACE FUNCTION public.registrar_historico_atividade()
RETURNS TRIGGER AS $$
BEGIN
  -- Status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.atividades_historico (atividade_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'status', OLD.status::TEXT, NEW.status::TEXT, auth.uid());
  END IF;
  
  -- Responsável
  IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
    INSERT INTO public.atividades_historico (atividade_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'responsavel_id', OLD.responsavel_id::TEXT, NEW.responsavel_id::TEXT, auth.uid());
  END IF;
  
  -- Prioridade
  IF OLD.prioridade IS DISTINCT FROM NEW.prioridade THEN
    INSERT INTO public.atividades_historico (atividade_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'prioridade', OLD.prioridade::TEXT, NEW.prioridade::TEXT, auth.uid());
  END IF;
  
  -- Data de vencimento
  IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
    INSERT INTO public.atividades_historico (atividade_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT, auth.uid());
  END IF;
  
  -- Código de disposição
  IF OLD.codigo_disposicao_id IS DISTINCT FROM NEW.codigo_disposicao_id THEN
    INSERT INTO public.atividades_historico (atividade_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'codigo_disposicao_id', OLD.codigo_disposicao_id::TEXT, NEW.codigo_disposicao_id::TEXT, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para atualizar scores de prioridade
CREATE OR REPLACE FUNCTION public.calcular_score_prioridade(p_atividade_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_lead_fit DECIMAL;
  v_engajamento DECIMAL;
  v_decaimento DECIMAL;
  v_urgencia DECIMAL;
  v_valor DECIMAL;
  v_score DECIMAL;
  v_vencimento TIMESTAMP WITH TIME ZONE;
  v_prioridade prioridade_atividade;
  v_valor_potencial DECIMAL;
BEGIN
  -- Buscar dados da atividade
  SELECT 
    COALESCE(score_lead_fit, 50),
    COALESCE(score_engajamento, 50),
    data_vencimento,
    prioridade,
    COALESCE(score_valor_potencial, 0)
  INTO v_lead_fit, v_engajamento, v_vencimento, v_prioridade, v_valor_potencial
  FROM public.atividades
  WHERE id = p_atividade_id;
  
  -- Calcular decaimento temporal
  IF v_vencimento IS NULL THEN
    v_decaimento := 0;
  ELSIF v_vencimento < now() THEN
    v_decaimento := -100; -- Atrasada
  ELSE
    v_decaimento := GREATEST(0, 100 - EXTRACT(EPOCH FROM (v_vencimento - now())) / 3600);
  END IF;
  
  -- Calcular urgência
  v_urgencia := CASE v_prioridade
    WHEN 'critica' THEN 100
    WHEN 'alta' THEN 75
    WHEN 'media' THEN 50
    WHEN 'baixa' THEN 25
  END;
  
  -- Calcular bônus de valor
  v_valor := v_valor_potencial / 10000;
  
  -- Fórmula: Score = (LeadFit × Engajamento/100) - DecaimentoTemporal + Urgência + BonusValor
  v_score := (v_lead_fit * v_engajamento / 100) - v_decaimento + v_urgencia + v_valor;
  
  -- Atualizar atividade
  UPDATE public.atividades
  SET 
    score_prioridade = v_score,
    score_decaimento_temporal = v_decaimento,
    score_urgencia = v_urgencia,
    score_calculado_em = now()
  WHERE id = p_atividade_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para refresh da MV (chamada via pg_cron)
CREATE OR REPLACE FUNCTION public.refresh_mv_atividades_prioridade()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_atividades_prioridade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_gerar_numero_atividade ON public.atividades;
CREATE TRIGGER trigger_gerar_numero_atividade
  BEFORE INSERT ON public.atividades
  FOR EACH ROW
  WHEN (NEW.numero_atividade IS NULL)
  EXECUTE FUNCTION public.gerar_numero_atividade();

DROP TRIGGER IF EXISTS trigger_validar_conclusao_atividade ON public.atividades;
CREATE TRIGGER trigger_validar_conclusao_atividade
  BEFORE UPDATE ON public.atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_conclusao_atividade();

DROP TRIGGER IF EXISTS trigger_registrar_historico_atividade ON public.atividades;
CREATE TRIGGER trigger_registrar_historico_atividade
  AFTER UPDATE ON public.atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_historico_atividade();

DROP TRIGGER IF EXISTS trigger_atualizado_em_atividades ON public.atividades;
CREATE TRIGGER trigger_atualizado_em_atividades
  BEFORE UPDATE ON public.atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. ROW LEVEL SECURITY
-- =====================================================

-- Atividades
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_select_policy" ON public.atividades
  FOR SELECT USING (
    excluido_em IS NULL AND (
      responsavel_id = auth.uid()
      OR criado_por = auth.uid()
      OR auth_check_any_role(ARRAY['admin', 'manager', 'diretor_comercial', 'gerente_comercial'])
      OR (equipe_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.membros_equipe me
        WHERE me.equipe_id = atividades.equipe_id
          AND me.usuario_id = auth.uid()
          AND me.esta_ativo = true
      ))
    )
  );

CREATE POLICY "atividades_insert_policy" ON public.atividades
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "atividades_update_policy" ON public.atividades
  FOR UPDATE USING (
    responsavel_id = auth.uid()
    OR criado_por = auth.uid()
    OR auth_check_any_role(ARRAY['admin', 'manager', 'diretor_comercial', 'gerente_comercial'])
  );

CREATE POLICY "atividades_delete_policy" ON public.atividades
  FOR DELETE USING (
    auth_check_any_role(ARRAY['admin', 'manager'])
  );

-- Códigos de Disposição
ALTER TABLE public.codigos_disposicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "codigos_disposicao_select_policy" ON public.codigos_disposicao
  FOR SELECT USING (true);

CREATE POLICY "codigos_disposicao_manage_policy" ON public.codigos_disposicao
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- Regras NBA
ALTER TABLE public.nba_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_regras_select_policy" ON public.nba_regras
  FOR SELECT USING (true);

CREATE POLICY "nba_regras_manage_policy" ON public.nba_regras
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- Histórico de Atividades
ALTER TABLE public.atividades_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_historico_select_policy" ON public.atividades_historico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.atividades a
      WHERE a.id = atividades_historico.atividade_id
        AND (a.responsavel_id = auth.uid() OR a.criado_por = auth.uid() OR auth_check_any_role(ARRAY['admin', 'manager']))
    )
  );

CREATE POLICY "atividades_historico_insert_policy" ON public.atividades_historico
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- NBA Histórico
ALTER TABLE public.nba_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nba_historico_select_policy" ON public.nba_historico
  FOR SELECT USING (
    usuario_id = auth.uid() OR auth_check_any_role(ARRAY['admin', 'manager'])
  );

CREATE POLICY "nba_historico_insert_policy" ON public.nba_historico
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "nba_historico_update_policy" ON public.nba_historico
  FOR UPDATE USING (usuario_id = auth.uid());

-- Participantes
ALTER TABLE public.atividades_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_participantes_select_policy" ON public.atividades_participantes
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.atividades a
      WHERE a.id = atividades_participantes.atividade_id
        AND (a.responsavel_id = auth.uid() OR a.criado_por = auth.uid())
    )
    OR auth_check_any_role(ARRAY['admin', 'manager'])
  );

CREATE POLICY "atividades_participantes_manage_policy" ON public.atividades_participantes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.atividades a
      WHERE a.id = atividades_participantes.atividade_id
        AND (a.responsavel_id = auth.uid() OR a.criado_por = auth.uid())
    )
    OR auth_check_any_role(ARRAY['admin', 'manager'])
  );

-- Comentários
ALTER TABLE public.atividades_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_comentarios_select_policy" ON public.atividades_comentarios
  FOR SELECT USING (
    excluido_em IS NULL AND EXISTS (
      SELECT 1 FROM public.atividades a
      WHERE a.id = atividades_comentarios.atividade_id
        AND a.excluido_em IS NULL
    )
  );

CREATE POLICY "atividades_comentarios_insert_policy" ON public.atividades_comentarios
  FOR INSERT WITH CHECK (
    autor_id = auth.uid()
  );

CREATE POLICY "atividades_comentarios_update_policy" ON public.atividades_comentarios
  FOR UPDATE USING (autor_id = auth.uid());

CREATE POLICY "atividades_comentarios_delete_policy" ON public.atividades_comentarios
  FOR DELETE USING (
    autor_id = auth.uid() OR auth_check_any_role(ARRAY['admin', 'manager'])
  );

-- 14. GRANTS
-- =====================================================
GRANT SELECT ON public.mv_atividades_prioridade TO authenticated;
GRANT SELECT ON public.codigos_disposicao TO authenticated;
GRANT SELECT ON public.nba_regras TO authenticated;

-- 15. HABILITAR REALTIME PARA ATIVIDADES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades;
