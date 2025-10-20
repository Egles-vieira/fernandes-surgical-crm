-- Criar tabela principal de URAs
CREATE TABLE public.uras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  numero_telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  mensagem_boas_vindas TEXT NOT NULL,
  tipo_mensagem_boas_vindas TEXT DEFAULT 'texto' CHECK (tipo_mensagem_boas_vindas IN ('texto', 'audio_url')),
  url_audio_boas_vindas TEXT,
  voz_tts TEXT DEFAULT 'br-Ricardo',
  tempo_espera_digito INTEGER DEFAULT 5,
  opcao_invalida_mensagem TEXT DEFAULT 'Opção inválida. Por favor, tente novamente.',
  max_tentativas_invalidas INTEGER DEFAULT 3,
  acao_apos_max_tentativas TEXT DEFAULT 'desligar' CHECK (acao_apos_max_tentativas IN ('desligar', 'transferir_atendente', 'correio_voz')),
  ramal_transferencia_padrao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Criar tabela de opções da URA
CREATE TABLE public.ura_opcoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ura_id UUID NOT NULL REFERENCES public.uras(id) ON DELETE CASCADE,
  numero_opcao INTEGER NOT NULL CHECK (numero_opcao >= 0 AND numero_opcao <= 9),
  titulo TEXT NOT NULL,
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN ('menu_submenu', 'transferir_ramal', 'transferir_numero', 'reproduzir_audio', 'enviar_callback', 'desligar', 'correio_voz')),
  ura_submenu_id UUID REFERENCES public.uras(id) ON DELETE SET NULL,
  ramal_destino TEXT,
  numero_destino TEXT,
  mensagem_antes_acao TEXT,
  url_audio TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  horario_disponivel JSONB,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ura_id, numero_opcao)
);

-- Criar tabela de logs da URA
CREATE TABLE public.ura_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ura_id UUID REFERENCES public.uras(id) ON DELETE SET NULL,
  chamada_id TEXT,
  numero_origem TEXT,
  opcoes_selecionadas JSONB DEFAULT '[]'::jsonb,
  duracao_total INTEGER,
  status_final TEXT CHECK (status_final IN ('completada', 'desligada', 'transferida', 'erro')),
  transferido_para TEXT,
  tentativas_invalidas INTEGER DEFAULT 0,
  gravacao_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Criar tabela de áudios da URA
CREATE TABLE public.ura_audios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  url_audio TEXT NOT NULL,
  duracao_segundos INTEGER,
  formato TEXT DEFAULT 'mp3',
  tamanho_kb INTEGER,
  usado_em_uras INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Criar tabela de horários da URA
CREATE TABLE public.ura_horarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ura_id UUID NOT NULL REFERENCES public.uras(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  mensagem_fora_horario TEXT,
  acao_fora_horario TEXT DEFAULT 'desligar' CHECK (acao_fora_horario IN ('desligar', 'correio_voz', 'transferir_emergencia'))
);

-- Criar índices para melhor performance
CREATE INDEX idx_ura_opcoes_ura_id ON public.ura_opcoes(ura_id);
CREATE INDEX idx_ura_logs_ura_id ON public.ura_logs(ura_id);
CREATE INDEX idx_ura_logs_chamada_id ON public.ura_logs(chamada_id);
CREATE INDEX idx_ura_horarios_ura_id ON public.ura_horarios(ura_id);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_uras_updated_at
  BEFORE UPDATE ON public.uras
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.uras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ura_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ura_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ura_audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ura_horarios ENABLE ROW LEVEL SECURITY;

-- Policies para tabela uras
CREATE POLICY "Admins e Managers podem gerenciar URAs"
  ON public.uras
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales podem visualizar URAs ativas"
  ON public.uras
  FOR SELECT
  USING (has_role(auth.uid(), 'sales'::app_role) AND ativo = true);

-- Policies para tabela ura_opcoes
CREATE POLICY "Admins e Managers podem gerenciar opções de URA"
  ON public.ura_opcoes
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales podem visualizar opções de URA"
  ON public.ura_opcoes
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

-- Policies para tabela ura_logs
CREATE POLICY "Admins e Managers podem visualizar logs de URA"
  ON public.ura_logs
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sistema pode inserir logs de URA"
  ON public.ura_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies para tabela ura_audios
CREATE POLICY "Admins e Managers podem gerenciar áudios de URA"
  ON public.ura_audios
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Usuários podem visualizar áudios de URA"
  ON public.ura_audios
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies para tabela ura_horarios
CREATE POLICY "Admins e Managers podem gerenciar horários de URA"
  ON public.ura_horarios
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Usuários podem visualizar horários de URA"
  ON public.ura_horarios
  FOR SELECT
  USING (auth.uid() IS NOT NULL);