-- =====================================================
-- ETAPA 1: INFRAESTRUTURA DE BANCO DE DADOS - MÓDULO WHATSAPP BUSINESS
-- Migração para API Oficial da Meta (removendo Gupshup)
-- =====================================================

-- 1. ENUM para nível de risco de auditoria
DO $$ BEGIN
  CREATE TYPE public.nivel_risco_auditoria AS ENUM ('baixo', 'medio', 'alto', 'critico');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABELA: whatsapp_unidades
-- Gestão de múltiplas filiais para direcionamento
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificação
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE,
  cnpj VARCHAR(18),
  -- Endereço completo
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  cep VARCHAR(10),
  pais VARCHAR(50) DEFAULT 'Brasil',
  -- Geolocalização (crítico para roteamento)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  raio_cobertura_km INTEGER DEFAULT 50,
  -- Contatos
  telefone_principal VARCHAR(20),
  telefone_whatsapp VARCHAR(20),
  email VARCHAR(255),
  -- Vinculação com WhatsApp
  whatsapp_conta_id UUID REFERENCES public.whatsapp_contas(id),
  -- Status
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'suspensa')),
  -- Configurações específicas
  aceita_atendimento_remoto BOOLEAN DEFAULT true,
  prioridade_roteamento INTEGER DEFAULT 0,
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID,
  excluido_em TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_unidades_status ON public.whatsapp_unidades(status) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_unidades_geo ON public.whatsapp_unidades(latitude, longitude) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_unidades_conta ON public.whatsapp_unidades(whatsapp_conta_id);

-- RLS
ALTER TABLE public.whatsapp_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_unidades_select" ON public.whatsapp_unidades 
  FOR SELECT USING (status = 'ativa' AND excluido_em IS NULL);

CREATE POLICY "whatsapp_unidades_manage" ON public.whatsapp_unidades 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- =====================================================
-- 3. TABELA: whatsapp_expedientes
-- Configuração de horários de funcionamento
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vinculação (hierárquica: empresa > unidade > setor)
  tipo_entidade VARCHAR(30) NOT NULL CHECK (tipo_entidade IN ('empresa', 'unidade', 'setor', 'fila')),
  entidade_id UUID, -- ID da entidade (pode ser NULL para empresa global)
  -- Identificação
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  -- Fuso horário
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  -- Horários por dia da semana (JSONB para flexibilidade)
  horarios_semana JSONB NOT NULL DEFAULT '{
    "seg": [{"inicio": "08:00", "fim": "18:00"}],
    "ter": [{"inicio": "08:00", "fim": "18:00"}],
    "qua": [{"inicio": "08:00", "fim": "18:00"}],
    "qui": [{"inicio": "08:00", "fim": "18:00"}],
    "sex": [{"inicio": "08:00", "fim": "18:00"}],
    "sab": [],
    "dom": []
  }',
  -- Configurações de comportamento fora do expediente
  comportamento_fora_expediente VARCHAR(30) DEFAULT 'manter_fila' 
    CHECK (comportamento_fora_expediente IN ('rejeitar', 'manter_fila', 'coletar_dados')),
  mensagem_fora_expediente TEXT DEFAULT 'Estamos fora do horário de atendimento. Retornaremos em breve.',
  mensagem_feriado TEXT,
  -- Status e prioridade
  prioridade INTEGER DEFAULT 0,
  esta_ativo BOOLEAN DEFAULT true,
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_expedientes_entidade ON public.whatsapp_expedientes(tipo_entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_expedientes_ativo ON public.whatsapp_expedientes(esta_ativo);

-- RLS
ALTER TABLE public.whatsapp_expedientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_expedientes_select" ON public.whatsapp_expedientes 
  FOR SELECT USING (esta_ativo = true);

CREATE POLICY "whatsapp_expedientes_manage" ON public.whatsapp_expedientes 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- =====================================================
-- 4. TABELA: whatsapp_feriados
-- Feriados e datas especiais
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificação
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  -- Data
  data DATE NOT NULL,
  eh_recorrente BOOLEAN DEFAULT false,
  -- Abrangência
  abrangencia VARCHAR(30) DEFAULT 'empresa' 
    CHECK (abrangencia IN ('nacional', 'estadual', 'municipal', 'empresa')),
  estado VARCHAR(2),
  cidade VARCHAR(100),
  -- Unidades afetadas (NULL = todas)
  unidades_ids UUID[],
  -- Tipo de fechamento
  tipo_fechamento VARCHAR(30) DEFAULT 'fechado' 
    CHECK (tipo_fechamento IN ('fechado', 'horario_reduzido')),
  -- Horário especial (se horario_reduzido)
  horario_especial JSONB, -- {"inicio": "09:00", "fim": "13:00"}
  -- Mensagem específica
  mensagem_feriado TEXT,
  -- Status
  esta_ativo BOOLEAN DEFAULT true,
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_feriados_data ON public.whatsapp_feriados(data) WHERE esta_ativo = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_feriados_recorrente ON public.whatsapp_feriados(eh_recorrente, data);

-- RLS
ALTER TABLE public.whatsapp_feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_feriados_select" ON public.whatsapp_feriados 
  FOR SELECT USING (esta_ativo = true);

CREATE POLICY "whatsapp_feriados_manage" ON public.whatsapp_feriados 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- =====================================================
-- 5. TABELA: whatsapp_configuracoes_atendimento
-- Configurações centralizadas de atendimento
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_configuracoes_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vinculação (hierárquica)
  nivel VARCHAR(30) DEFAULT 'empresa' CHECK (nivel IN ('empresa', 'unidade', 'setor', 'operador')),
  entidade_id UUID, -- NULL para empresa global
  -- SLA de Inatividade
  sla_inatividade_horas INTEGER DEFAULT 72,
  mensagem_encerramento_inatividade TEXT DEFAULT 'Atendimento encerrado por inatividade. Para novo contato, envie uma mensagem.',
  tabulacao_padrao_inatividade UUID REFERENCES public.codigos_disposicao(id),
  notificar_antes_encerramento_minutos INTEGER DEFAULT 30,
  -- Throttling (Controle de Concorrência)
  max_atendimentos_simultaneos INTEGER DEFAULT 8,
  bloquear_ao_atingir_limite BOOLEAN DEFAULT true,
  -- Distribuição
  tempo_max_aceite_segundos INTEGER DEFAULT 60,
  tipo_distribuicao VARCHAR(30) DEFAULT 'round_robin' 
    CHECK (tipo_distribuicao IN ('round_robin', 'menos_ocupado', 'por_especialidade', 'carteira_primeiro')),
  -- Carteirização (Sticky Agent)
  carteirizacao_ativa BOOLEAN DEFAULT true,
  modo_carteirizacao VARCHAR(30) DEFAULT 'priorizar' CHECK (modo_carteirizacao IN ('priorizar', 'forcar')),
  -- Roteamento por Disponibilidade
  apenas_operadores_online BOOLEAN DEFAULT true,
  -- Identidade do Agente
  exibir_nome_operador BOOLEAN DEFAULT true,
  formato_nome VARCHAR(30) DEFAULT 'primeiro_nome' 
    CHECK (formato_nome IN ('nome_completo', 'primeiro_nome', 'nome_sobrenome_inicial')),
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID,
  -- Constraint de unicidade
  UNIQUE(nivel, entidade_id)
);

-- RLS
ALTER TABLE public.whatsapp_configuracoes_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_config_select" ON public.whatsapp_configuracoes_atendimento 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "whatsapp_config_manage" ON public.whatsapp_configuracoes_atendimento 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- =====================================================
-- 6. TABELA: whatsapp_templates_sistema
-- Templates de mensagens automáticas do sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_templates_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificação
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  -- Tipo de template
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'boas_vindas',
    'aguarde_fila',
    'encerramento',
    'pausa_operador',
    'feriado',
    'fora_expediente',
    'transferencia',
    'aviso_inatividade',
    'pesquisa_satisfacao',
    'confirmacao_dados'
  )),
  -- Conteúdo com variáveis
  conteudo TEXT NOT NULL,
  -- Variáveis disponíveis
  variaveis_disponiveis TEXT[] DEFAULT ARRAY[
    '@NOMEOPERADOR', '@NOMECLIENTE', '@SETOR',
    '@PROTOCOLO', '@POSICAOFILA', '@TEMPOESTIMADO',
    '@HORARIOFUNCIONAMENTO', '@DATA', '@HORA'
  ],
  -- Vinculação opcional
  unidade_id UUID REFERENCES public.whatsapp_unidades(id),
  setor_id UUID REFERENCES public.filas_atendimento(id),
  -- Status
  esta_ativo BOOLEAN DEFAULT true,
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sistema_tipo ON public.whatsapp_templates_sistema(tipo);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_sistema_codigo ON public.whatsapp_templates_sistema(codigo);

-- RLS
ALTER TABLE public.whatsapp_templates_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_templates_sistema_select" ON public.whatsapp_templates_sistema 
  FOR SELECT USING (esta_ativo = true);

CREATE POLICY "whatsapp_templates_sistema_manage" ON public.whatsapp_templates_sistema 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- Popular templates padrão
INSERT INTO public.whatsapp_templates_sistema (codigo, nome, tipo, conteudo) VALUES
  ('BOAS_VINDAS', 'Boas-vindas', 'boas_vindas', 'Olá @NOMECLIENTE! 👋 Bem-vindo ao atendimento. Em que podemos ajudar?'),
  ('AGUARDE_FILA', 'Aguarde na Fila', 'aguarde_fila', 'Você está na posição @POSICAOFILA da fila. Tempo estimado: @TEMPOESTIMADO. Aguarde que em breve você será atendido.'),
  ('ENCERRAMENTO', 'Encerramento', 'encerramento', 'Atendimento finalizado. Protocolo: @PROTOCOLO. Obrigado por entrar em contato! 🙏'),
  ('PAUSA_OPERADOR', 'Pausa do Operador', 'pausa_operador', '@NOMECLIENTE, o operador @NOMEOPERADOR entrou em pausa. Você será atendido em breve.'),
  ('FORA_EXPEDIENTE', 'Fora do Expediente', 'fora_expediente', 'Nosso horário de atendimento é @HORARIOFUNCIONAMENTO. Retornaremos seu contato assim que possível.'),
  ('TRANSFERENCIA', 'Transferência', 'transferencia', 'Você está sendo transferido para o setor @SETOR. Aguarde um momento.'),
  ('AVISO_INATIVIDADE', 'Aviso de Inatividade', 'aviso_inatividade', '@NOMECLIENTE, não detectamos atividade. O atendimento será encerrado em 30 minutos caso não haja resposta.')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 7. TABELA: whatsapp_carteiras
-- Vinculação de contatos a operadores (Sticky Agent)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_carteiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vinculação
  whatsapp_contato_id UUID NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
  operador_id UUID NOT NULL,
  -- Tipo de vinculação
  tipo VARCHAR(30) DEFAULT 'automatico' CHECK (tipo IN ('automatico', 'manual', 'transferido')),
  -- Status
  esta_ativo BOOLEAN DEFAULT true,
  -- Métricas
  total_atendimentos INTEGER DEFAULT 0,
  ultimo_atendimento_em TIMESTAMPTZ,
  -- Transferência
  transferido_de_id UUID,
  transferido_em TIMESTAMPTZ,
  motivo_transferencia TEXT,
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(whatsapp_contato_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_carteiras_operador ON public.whatsapp_carteiras(operador_id) WHERE esta_ativo = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_carteiras_contato ON public.whatsapp_carteiras(whatsapp_contato_id);

-- RLS
ALTER TABLE public.whatsapp_carteiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_carteiras_select" ON public.whatsapp_carteiras 
  FOR SELECT USING (operador_id = auth.uid() OR auth_check_any_role(ARRAY['admin', 'manager']));

CREATE POLICY "whatsapp_carteiras_manage" ON public.whatsapp_carteiras 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- =====================================================
-- 8. TABELA: whatsapp_fila_espera
-- Gerenciamento da fila de espera em tempo real
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_fila_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Conversa em espera
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  -- Setor/Fila de destino
  fila_destino_id UUID REFERENCES public.filas_atendimento(id),
  unidade_id UUID REFERENCES public.whatsapp_unidades(id),
  -- Posicionamento
  posicao INTEGER NOT NULL,
  prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  -- Tempos
  entrou_fila_em TIMESTAMPTZ DEFAULT now(),
  tempo_estimado_segundos INTEGER,
  -- Operador preferencial (carteira)
  operador_preferencial_id UUID,
  -- Status
  status VARCHAR(30) DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_distribuicao', 'atendido', 'cancelado', 'expirado')),
  -- Atendimento
  atendido_por_id UUID,
  atendido_em TIMESTAMPTZ,
  -- Tentativas de distribuição
  tentativas_distribuicao INTEGER DEFAULT 0,
  ultima_tentativa_em TIMESTAMPTZ,
  operadores_rejeitaram UUID[],
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_fila_espera_status ON public.whatsapp_fila_espera(status, posicao) WHERE status = 'aguardando';
CREATE INDEX IF NOT EXISTS idx_whatsapp_fila_espera_fila ON public.whatsapp_fila_espera(fila_destino_id, posicao);
CREATE INDEX IF NOT EXISTS idx_whatsapp_fila_espera_conversa ON public.whatsapp_fila_espera(conversa_id);

-- RLS
ALTER TABLE public.whatsapp_fila_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_fila_espera_select" ON public.whatsapp_fila_espera 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "whatsapp_fila_espera_manage" ON public.whatsapp_fila_espera 
  FOR ALL USING (auth_check_any_role(ARRAY['admin', 'manager']));

-- =====================================================
-- 9. TABELA: whatsapp_auditoria
-- Trilha de auditoria com classificação de risco
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Quem
  usuario_id UUID,
  usuario_nome VARCHAR(200),
  usuario_role VARCHAR(50),
  -- O que
  acao VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  descricao TEXT,
  -- Onde (entidade afetada)
  entidade_tipo VARCHAR(50),
  entidade_id UUID,
  entidade_nome VARCHAR(200),
  -- Dados alterados
  dados_anteriores JSONB,
  dados_novos JSONB,
  -- Classificação de Risco
  nivel_risco public.nivel_risco_auditoria DEFAULT 'baixo',
  -- Contexto técnico
  ip_address INET,
  user_agent TEXT,
  dispositivo VARCHAR(100),
  localizacao_aproximada VARCHAR(200),
  -- Timestamp preciso
  ocorrido_em TIMESTAMPTZ DEFAULT now(),
  -- Alertas
  alerta_enviado BOOLEAN DEFAULT false,
  alerta_enviado_em TIMESTAMPTZ,
  alerta_para UUID[]
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_whatsapp_auditoria_usuario ON public.whatsapp_auditoria(usuario_id, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_auditoria_acao ON public.whatsapp_auditoria(acao, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_auditoria_risco ON public.whatsapp_auditoria(nivel_risco, ocorrido_em DESC) WHERE nivel_risco IN ('alto', 'critico');
CREATE INDEX IF NOT EXISTS idx_whatsapp_auditoria_entidade ON public.whatsapp_auditoria(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_auditoria_data ON public.whatsapp_auditoria(ocorrido_em DESC);

-- RLS
ALTER TABLE public.whatsapp_auditoria ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver auditoria
CREATE POLICY "whatsapp_auditoria_select" ON public.whatsapp_auditoria 
  FOR SELECT USING (auth_check_any_role(ARRAY['admin']));

-- Inserção aberta para sistema
CREATE POLICY "whatsapp_auditoria_insert" ON public.whatsapp_auditoria 
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 10. TABELA: whatsapp_etiquetas_ia
-- Etiquetas aplicadas automaticamente por IA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_etiquetas_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vinculação
  conversa_id UUID REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  mensagem_id UUID REFERENCES public.whatsapp_mensagens(id) ON DELETE CASCADE,
  -- Etiqueta
  etiqueta VARCHAR(100) NOT NULL,
  categoria VARCHAR(50),
  -- Confiança da IA
  confianca DECIMAL(5, 2) NOT NULL,
  modelo_ia VARCHAR(50),
  -- Validação humana
  validada_por_humano BOOLEAN DEFAULT false,
  validada_por UUID,
  validada_em TIMESTAMPTZ,
  foi_corrigida BOOLEAN DEFAULT false,
  etiqueta_corrigida VARCHAR(100),
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_etiquetas_ia_conversa ON public.whatsapp_etiquetas_ia(conversa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_etiquetas_ia_etiqueta ON public.whatsapp_etiquetas_ia(etiqueta);
CREATE INDEX IF NOT EXISTS idx_whatsapp_etiquetas_ia_confianca ON public.whatsapp_etiquetas_ia(confianca DESC);

-- RLS
ALTER TABLE public.whatsapp_etiquetas_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_etiquetas_ia_select" ON public.whatsapp_etiquetas_ia 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "whatsapp_etiquetas_ia_insert" ON public.whatsapp_etiquetas_ia 
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 11. TABELA: whatsapp_tabulacoes
-- Registro de tabulação de conversas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_tabulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vinculação
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id),
  -- Tabulação
  codigo_disposicao_id UUID NOT NULL REFERENCES public.codigos_disposicao(id),
  -- Subcategoria (hierarquia)
  subcategoria VARCHAR(100),
  -- Observações
  observacoes TEXT,
  -- Próximos passos
  proximo_passo TEXT,
  proximo_contato_em TIMESTAMPTZ,
  -- Quem tabulou
  tabulado_por UUID NOT NULL,
  tabulado_em TIMESTAMPTZ DEFAULT now(),
  -- Metadados
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_tabulacoes_conversa ON public.whatsapp_tabulacoes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tabulacoes_codigo ON public.whatsapp_tabulacoes(codigo_disposicao_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tabulacoes_operador ON public.whatsapp_tabulacoes(tabulado_por, tabulado_em DESC);

-- RLS
ALTER TABLE public.whatsapp_tabulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_tabulacoes_select" ON public.whatsapp_tabulacoes 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "whatsapp_tabulacoes_insert" ON public.whatsapp_tabulacoes 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 12. ALTERAÇÕES: whatsapp_contas - Campos para Meta API
-- =====================================================
ALTER TABLE public.whatsapp_contas 
  ADD COLUMN IF NOT EXISTS waba_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS phone_number_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
  ADD COLUMN IF NOT EXISTS business_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS api_version VARCHAR(10) DEFAULT 'v21.0',
  ADD COLUMN IF NOT EXISTS unidade_padrao_id UUID REFERENCES public.whatsapp_unidades(id),
  ADD COLUMN IF NOT EXISTS menu_setores_config JSONB DEFAULT '{
    "tipo_selecao": "numeros",
    "exibir_setores_fechados": false,
    "ordem": "manual",
    "usar_emojis": true
  }',
  ADD COLUMN IF NOT EXISTS expediente_id UUID;

-- =====================================================
-- 13. ALTERAÇÕES: whatsapp_conversas - Campos de roteamento
-- =====================================================
ALTER TABLE public.whatsapp_conversas 
  ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES public.whatsapp_unidades(id),
  ADD COLUMN IF NOT EXISTS fila_id UUID REFERENCES public.filas_atendimento(id),
  ADD COLUMN IF NOT EXISTS numero_protocolo VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS em_distribuicao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS distribuicao_iniciada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tentativas_distribuicao INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS origem_atendimento VARCHAR(50) DEFAULT 'direto',
  ADD COLUMN IF NOT EXISTS campanha_origem VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nps_score INTEGER,
  ADD COLUMN IF NOT EXISTS csat_score INTEGER;

-- Novos índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_unidade ON public.whatsapp_conversas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_fila ON public.whatsapp_conversas(fila_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_protocolo ON public.whatsapp_conversas(numero_protocolo);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_distribuicao ON public.whatsapp_conversas(em_distribuicao) WHERE em_distribuicao = true;

-- =====================================================
-- 14. ALTERAÇÕES: perfis_usuario - Campos de atendimento WhatsApp
-- =====================================================
ALTER TABLE public.perfis_usuario 
  ADD COLUMN IF NOT EXISTS status_atendimento_whatsapp VARCHAR(30) DEFAULT 'offline' 
    CHECK (status_atendimento_whatsapp IS NULL OR status_atendimento_whatsapp IN ('online', 'ocupado', 'pausa', 'offline')),
  ADD COLUMN IF NOT EXISTS motivo_pausa VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pausa_iniciada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_atendimentos_whatsapp INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS atendimentos_ativos_whatsapp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS filas_atendimento_ids UUID[],
  ADD COLUMN IF NOT EXISTS unidades_atendimento_ids UUID[],
  ADD COLUMN IF NOT EXISTS total_atendimentos_dia INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_medio_atendimento_dia INTEGER,
  ADD COLUMN IF NOT EXISTS ultimo_atendimento_whatsapp_em TIMESTAMPTZ;

-- Índice para busca de operadores disponíveis
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_status_whatsapp ON public.perfis_usuario(status_atendimento_whatsapp, atendimentos_ativos_whatsapp) WHERE esta_ativo = true;

-- =====================================================
-- 15. TRIGGER: Gerar número de protocolo automático
-- =====================================================
CREATE OR REPLACE FUNCTION public.gerar_numero_protocolo_whatsapp()
RETURNS TRIGGER AS $$
DECLARE 
  ano TEXT; 
  mes TEXT; 
  contador INTEGER; 
BEGIN 
  IF NEW.numero_protocolo IS NULL THEN 
    ano := TO_CHAR(CURRENT_DATE, 'YY'); 
    mes := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_protocolo FROM 8) AS INTEGER)), 0) + 1
    INTO contador
    FROM public.whatsapp_conversas
    WHERE numero_protocolo LIKE 'WA' || ano || mes || '%';
    
    NEW.numero_protocolo := 'WA' || ano || mes || LPAD(contador::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_numero_protocolo_whatsapp ON public.whatsapp_conversas;
CREATE TRIGGER set_numero_protocolo_whatsapp 
  BEFORE INSERT ON public.whatsapp_conversas 
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_protocolo_whatsapp();

-- =====================================================
-- 16. TRIGGER: Classificar risco de auditoria automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.classificar_risco_auditoria() 
RETURNS TRIGGER AS $$
BEGIN
  -- Eventos de alto risco
  IF NEW.acao IN ('exportar_base', 'deletar_massa', 'alterar_permissoes', 'acesso_dados_restritos') THEN
    NEW.nivel_risco := 'critico';
  ELSIF NEW.acao IN ('criar_contato_manual', 'alterar_dados_sensiveis', 'multiplas_tentativas_login') THEN
    NEW.nivel_risco := 'alto';
  ELSIF NEW.acao IN ('transferir_carteira', 'alterar_configuracoes') THEN
    NEW.nivel_risco := 'medio';
  ELSE
    NEW.nivel_risco := 'baixo';
  END IF;
  
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_classificar_risco ON public.whatsapp_auditoria;
CREATE TRIGGER trigger_classificar_risco 
  BEFORE INSERT ON public.whatsapp_auditoria 
  FOR EACH ROW EXECUTE FUNCTION public.classificar_risco_auditoria();

-- =====================================================
-- 17. FUNÇÃO: Verificar se está dentro do expediente
-- =====================================================
CREATE OR REPLACE FUNCTION public.verificar_dentro_expediente(
  p_unidade_id UUID DEFAULT NULL,
  p_setor_id UUID DEFAULT NULL,
  p_timestamp TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
  v_expediente RECORD;
  v_dia_semana TEXT;
  v_hora_atual TIME;
  v_horarios JSONB;
  v_dentro_expediente BOOLEAN := false;
  v_feriado RECORD;
BEGIN
  -- Verificar feriado primeiro
  SELECT * INTO v_feriado
  FROM whatsapp_feriados
  WHERE data = p_timestamp::DATE 
    AND esta_ativo = true 
    AND (unidades_ids IS NULL OR p_unidade_id = ANY(unidades_ids))
  LIMIT 1;

  IF FOUND THEN
    IF v_feriado.tipo_fechamento = 'fechado' THEN
      RETURN jsonb_build_object(
        'dentro_expediente', false,
        'motivo', 'feriado',
        'feriado_nome', v_feriado.nome,
        'mensagem', COALESCE(v_feriado.mensagem_feriado, 'Feriado - Não há atendimento')
      );
    END IF;
  END IF;

  -- Buscar expediente hierarquicamente
  SELECT * INTO v_expediente
  FROM whatsapp_expedientes
  WHERE esta_ativo = true
    AND (
      (tipo_entidade = 'setor' AND entidade_id = p_setor_id) OR
      (tipo_entidade = 'unidade' AND entidade_id = p_unidade_id) OR
      (tipo_entidade = 'empresa' AND entidade_id IS NULL)
    )
  ORDER BY
    CASE tipo_entidade
      WHEN 'setor' THEN 1
      WHEN 'unidade' THEN 2
      WHEN 'empresa' THEN 3
    END
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('dentro_expediente', true, 'motivo', 'sem_expediente_configurado');
  END IF;

  -- Converter para timezone do expediente
  v_hora_atual := (p_timestamp AT TIME ZONE v_expediente.timezone)::TIME;
  v_dia_semana := LOWER(to_char(p_timestamp AT TIME ZONE v_expediente.timezone, 'Dy'));

  -- Mapear dia da semana
  v_dia_semana := CASE v_dia_semana
    WHEN 'mon' THEN 'seg'
    WHEN 'tue' THEN 'ter'
    WHEN 'wed' THEN 'qua'
    WHEN 'thu' THEN 'qui'
    WHEN 'fri' THEN 'sex'
    WHEN 'sat' THEN 'sab'
    WHEN 'sun' THEN 'dom'
  END;

  -- Verificar horários do dia
  v_horarios := v_expediente.horarios_semana->v_dia_semana;

  IF v_horarios IS NULL OR jsonb_array_length(v_horarios) = 0 THEN
    RETURN jsonb_build_object(
      'dentro_expediente', false,
      'motivo', 'dia_sem_expediente',
      'comportamento', v_expediente.comportamento_fora_expediente,
      'mensagem', v_expediente.mensagem_fora_expediente
    );
  END IF;

  -- Verificar se está em algum turno
  FOR i IN 0..jsonb_array_length(v_horarios)-1 LOOP
    IF v_hora_atual >= (v_horarios->i->>'inicio')::TIME 
       AND v_hora_atual <= (v_horarios->i->>'fim')::TIME THEN
      v_dentro_expediente := true;
      EXIT;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'dentro_expediente', v_dentro_expediente,
    'motivo', CASE WHEN v_dentro_expediente THEN 'dentro_horario' ELSE 'fora_horario' END,
    'comportamento', CASE WHEN NOT v_dentro_expediente THEN v_expediente.comportamento_fora_expediente END,
    'mensagem', CASE WHEN NOT v_dentro_expediente THEN v_expediente.mensagem_fora_expediente END
  );
END; 
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 18. FUNÇÃO: Distribuir conversa WhatsApp
-- =====================================================
CREATE OR REPLACE FUNCTION public.distribuir_conversa_whatsapp(
  p_conversa_id UUID,
  p_fila_id UUID DEFAULT NULL,
  p_unidade_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_conversa RECORD;
  v_config RECORD;
  v_operador_id UUID;
BEGIN
  -- Buscar conversa
  SELECT * INTO v_conversa FROM whatsapp_conversas WHERE id = p_conversa_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'Conversa não encontrada');
  END IF;

  -- Buscar configurações
  SELECT * INTO v_config
  FROM whatsapp_configuracoes_atendimento
  WHERE nivel = 'empresa' AND entidade_id IS NULL
  LIMIT 1;

  -- 1. Verificar carteira (Sticky Agent)
  IF v_config.carteirizacao_ativa THEN
    SELECT c.operador_id INTO v_operador_id
    FROM whatsapp_carteiras c
    JOIN perfis_usuario p ON p.id = c.operador_id
    WHERE c.whatsapp_contato_id = v_conversa.whatsapp_contato_id
      AND c.esta_ativo = true
      AND p.status_atendimento_whatsapp = 'online'
      AND p.atendimentos_ativos_whatsapp < p.max_atendimentos_whatsapp;

    IF FOUND THEN
      -- Atribuir ao operador da carteira
      UPDATE whatsapp_conversas
      SET atribuida_para_id = v_operador_id,
          atribuida_em = now(),
          atribuicao_automatica = true,
          status = 'em_atendimento'
      WHERE id = p_conversa_id;

      UPDATE perfis_usuario
      SET atendimentos_ativos_whatsapp = atendimentos_ativos_whatsapp + 1
      WHERE id = v_operador_id;

      RETURN jsonb_build_object(
        'sucesso', true,
        'tipo_atribuicao', 'carteira',
        'operador_id', v_operador_id
      );
    ELSIF v_config.modo_carteirizacao = 'forcar' THEN
      -- Modo forçado: aguardar operador da carteira
      INSERT INTO whatsapp_fila_espera (conversa_id, fila_destino_id, unidade_id, posicao, operador_preferencial_id)
      SELECT p_conversa_id, p_fila_id, p_unidade_id, COALESCE(MAX(posicao), 0) + 1, c.operador_id
      FROM whatsapp_fila_espera fe
      LEFT JOIN whatsapp_carteiras c ON c.whatsapp_contato_id = v_conversa.whatsapp_contato_id
      WHERE fe.status = 'aguardando';

      RETURN jsonb_build_object(
        'sucesso', true,
        'tipo_atribuicao', 'fila_aguardando_carteira',
        'mensagem', 'Aguardando operador da carteira ficar disponível'
      );
    END IF;
  END IF;

  -- 2. Buscar operador disponível
  SELECT p.id INTO v_operador_id
  FROM perfis_usuario p
  WHERE p.status_atendimento_whatsapp = 'online'
    AND p.atendimentos_ativos_whatsapp < p.max_atendimentos_whatsapp
    AND p.esta_ativo = true
    AND (p_fila_id IS NULL OR p_fila_id = ANY(p.filas_atendimento_ids))
    AND (p_unidade_id IS NULL OR p_unidade_id = ANY(p.unidades_atendimento_ids))
  ORDER BY
    CASE COALESCE(v_config.tipo_distribuicao, 'round_robin')
      WHEN 'menos_ocupado' THEN p.atendimentos_ativos_whatsapp
      ELSE 0
    END,
    p.ultimo_atendimento_whatsapp_em NULLS FIRST
  LIMIT 1;

  IF FOUND THEN
    -- Atribuir ao operador
    UPDATE whatsapp_conversas
    SET atribuida_para_id = v_operador_id,
        atribuida_em = now(),
        atribuicao_automatica = true,
        status = 'em_atendimento',
        fila_id = p_fila_id,
        unidade_id = p_unidade_id
    WHERE id = p_conversa_id;

    UPDATE perfis_usuario
    SET atendimentos_ativos_whatsapp = atendimentos_ativos_whatsapp + 1,
        ultimo_atendimento_whatsapp_em = now()
    WHERE id = v_operador_id;

    -- Criar carteira se não existir
    INSERT INTO whatsapp_carteiras (whatsapp_contato_id, operador_id, tipo)
    VALUES (v_conversa.whatsapp_contato_id, v_operador_id, 'automatico')
    ON CONFLICT (whatsapp_contato_id) DO NOTHING;

    RETURN jsonb_build_object(
      'sucesso', true,
      'tipo_atribuicao', 'distribuicao_automatica',
      'operador_id', v_operador_id
    );
  ELSE
    -- 3. Adicionar à fila de espera
    INSERT INTO whatsapp_fila_espera (conversa_id, fila_destino_id, unidade_id, posicao)
    SELECT p_conversa_id, p_fila_id, p_unidade_id, COALESCE(MAX(posicao), 0) + 1
    FROM whatsapp_fila_espera
    WHERE status = 'aguardando'
      AND (fila_destino_id = p_fila_id OR (fila_destino_id IS NULL AND p_fila_id IS NULL));

    UPDATE whatsapp_conversas
    SET status = 'na_fila',
        fila_id = p_fila_id,
        unidade_id = p_unidade_id
    WHERE id = p_conversa_id;

    RETURN jsonb_build_object(
      'sucesso', true,
      'tipo_atribuicao', 'fila_espera',
      'mensagem', 'Todos operadores ocupados, conversa adicionada à fila'
    );
  END IF;
END; 
$$ LANGUAGE plpgsql;

-- =====================================================
-- 19. MATERIALIZED VIEW: Dashboard BAM
-- =====================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_whatsapp_bam_dashboard;
CREATE MATERIALIZED VIEW public.mv_whatsapp_bam_dashboard AS
WITH metricas_fila AS (
  SELECT 
    fila_destino_id,
    COUNT(*) FILTER (WHERE status = 'aguardando') AS aguardando,
    AVG(EXTRACT(EPOCH FROM (COALESCE(atendido_em, now()) - entrou_fila_em))) FILTER (WHERE status = 'aguardando') AS tempo_medio_espera,
    MAX(EXTRACT(EPOCH FROM (COALESCE(atendido_em, now()) - entrou_fila_em))) FILTER (WHERE status = 'aguardando') AS tempo_max_espera
  FROM whatsapp_fila_espera
  WHERE status IN ('aguardando', 'atendido')
    AND entrou_fila_em >= CURRENT_DATE
  GROUP BY fila_destino_id
),
metricas_operadores AS (
  SELECT 
    COUNT(*) FILTER (WHERE status_atendimento_whatsapp = 'online') AS operadores_online,
    COUNT(*) FILTER (WHERE status_atendimento_whatsapp = 'ocupado') AS operadores_ocupados,
    COUNT(*) FILTER (WHERE status_atendimento_whatsapp = 'pausa') AS operadores_pausa,
    COUNT(*) FILTER (WHERE status_atendimento_whatsapp = 'offline') AS operadores_offline,
    SUM(atendimentos_ativos_whatsapp) AS atendimentos_em_andamento,
    AVG(tempo_medio_atendimento_dia) AS tma_medio
  FROM perfis_usuario
  WHERE esta_ativo = true
),
metricas_conversas AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'em_atendimento') AS conversas_ativas,
    COUNT(*) FILTER (WHERE status = 'na_fila') AS conversas_na_fila,
    COUNT(*) FILTER (WHERE DATE(criado_em) = CURRENT_DATE) AS conversas_hoje,
    COUNT(*) FILTER (WHERE sentimento_cliente IN ('negativo', 'muito_negativo')) AS conversas_detratores
  FROM whatsapp_conversas
  WHERE criado_em >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  -- Métricas de Fila
  COALESCE(SUM(mf.aguardando), 0)::INTEGER AS total_fila_espera,
  COALESCE(AVG(mf.tempo_medio_espera), 0)::INTEGER AS tempo_medio_espera_segundos,
  COALESCE(MAX(mf.tempo_max_espera), 0)::INTEGER AS tempo_max_espera_segundos,
  -- Métricas de Operadores
  COALESCE(mo.operadores_online, 0)::INTEGER AS operadores_online,
  COALESCE(mo.operadores_ocupados, 0)::INTEGER AS operadores_ocupados,
  COALESCE(mo.operadores_pausa, 0)::INTEGER AS operadores_pausa,
  COALESCE(mo.operadores_offline, 0)::INTEGER AS operadores_offline,
  COALESCE(mo.atendimentos_em_andamento, 0)::INTEGER AS atendimentos_em_andamento,
  COALESCE(mo.tma_medio, 0)::INTEGER AS tma_medio_segundos,
  -- Métricas de Conversas
  COALESCE(mc.conversas_ativas, 0)::INTEGER AS conversas_ativas,
  COALESCE(mc.conversas_na_fila, 0)::INTEGER AS conversas_na_fila,
  COALESCE(mc.conversas_hoje, 0)::INTEGER AS conversas_hoje,
  COALESCE(mc.conversas_detratores, 0)::INTEGER AS conversas_detratores,
  -- Timestamp
  now() AS atualizado_em
FROM metricas_fila mf
CROSS JOIN metricas_operadores mo
CROSS JOIN metricas_conversas mc
GROUP BY mo.operadores_online, mo.operadores_ocupados, mo.operadores_pausa, mo.operadores_offline, 
         mo.atendimentos_em_andamento, mo.tma_medio, mc.conversas_ativas, mc.conversas_na_fila, 
         mc.conversas_hoje, mc.conversas_detratores;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_whatsapp_bam ON mv_whatsapp_bam_dashboard(atualizado_em);

-- Função para refresh
CREATE OR REPLACE FUNCTION public.refresh_whatsapp_bam_dashboard() 
RETURNS void AS $$ 
BEGIN 
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_whatsapp_bam_dashboard; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir configuração padrão de empresa se não existir
INSERT INTO public.whatsapp_configuracoes_atendimento (nivel, entidade_id)
VALUES ('empresa', NULL)
ON CONFLICT (nivel, entidade_id) DO NOTHING;

-- Habilitar Realtime para tabelas críticas
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_fila_espera;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_auditoria;