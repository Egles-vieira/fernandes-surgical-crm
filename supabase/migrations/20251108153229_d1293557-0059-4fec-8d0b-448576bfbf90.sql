-- Adicionar novos campos à tabela membros_equipe
ALTER TABLE public.membros_equipe
ADD COLUMN IF NOT EXISTS papel VARCHAR(50),
ADD COLUMN IF NOT EXISTS carga_trabalho INTEGER DEFAULT 100 CHECK (carga_trabalho >= 0 AND carga_trabalho <= 100),
ADD COLUMN IF NOT EXISTS nivel_acesso VARCHAR(50) DEFAULT 'padrao',
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS saiu_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_saida TEXT,
ADD COLUMN IF NOT EXISTS esta_ativo BOOLEAN DEFAULT true;

-- Criar tabela de histórico de membros
CREATE TABLE IF NOT EXISTS public.historico_membros_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  tipo_evento VARCHAR(50) NOT NULL, -- 'entrada', 'saida', 'transferencia_origem', 'transferencia_destino', 'mudanca_papel', 'mudanca_carga'
  equipe_origem_id UUID REFERENCES public.equipes(id),
  equipe_destino_id UUID REFERENCES public.equipes(id),
  papel_anterior VARCHAR(50),
  papel_novo VARCHAR(50),
  carga_trabalho_anterior INTEGER,
  carga_trabalho_nova INTEGER,
  motivo TEXT,
  dias_na_equipe INTEGER,
  realizado_por UUID REFERENCES auth.users(id),
  realizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_historico_membros_equipe_usuario ON public.historico_membros_equipe(usuario_id);
CREATE INDEX idx_historico_membros_equipe_equipe ON public.historico_membros_equipe(equipe_id);
CREATE INDEX idx_historico_membros_equipe_tipo ON public.historico_membros_equipe(tipo_evento);
CREATE INDEX idx_historico_membros_equipe_data ON public.historico_membros_equipe(realizado_em DESC);

-- RLS Policies
ALTER TABLE public.historico_membros_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar histórico de membros"
  ON public.historico_membros_equipe
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode inserir histórico de membros"
  ON public.historico_membros_equipe
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para registrar saída de membro
CREATE OR REPLACE FUNCTION public.registrar_saida_membro()
RETURNS TRIGGER AS $$
DECLARE
  dias_permanencia INTEGER;
BEGIN
  -- Quando um membro é marcado como saído
  IF NEW.saiu_em IS NOT NULL AND OLD.saiu_em IS NULL THEN
    -- Calcular dias na equipe
    dias_permanencia := EXTRACT(DAY FROM (NEW.saiu_em - NEW.entrou_em));
    
    -- Registrar no histórico
    INSERT INTO public.historico_membros_equipe (
      equipe_id,
      usuario_id,
      tipo_evento,
      motivo,
      dias_na_equipe,
      papel_anterior,
      carga_trabalho_anterior,
      realizado_por
    ) VALUES (
      NEW.equipe_id,
      NEW.usuario_id,
      'saida',
      NEW.motivo_saida,
      dias_permanencia,
      NEW.papel,
      NEW.carga_trabalho,
      auth.uid()
    );
    
    -- Registrar no histórico de atividades da equipe
    INSERT INTO public.historico_atividades_equipe (
      equipe_id,
      tipo_atividade,
      descricao,
      dados_anteriores,
      realizado_por
    ) VALUES (
      NEW.equipe_id,
      'remocao_membro',
      'Membro removido da equipe',
      jsonb_build_object(
        'usuario_id', NEW.usuario_id,
        'papel', NEW.papel,
        'dias_na_equipe', dias_permanencia,
        'motivo', NEW.motivo_saida
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_registrar_saida_membro
AFTER UPDATE ON public.membros_equipe
FOR EACH ROW
EXECUTE FUNCTION public.registrar_saida_membro();

-- Trigger para registrar mudanças de papel/carga
CREATE OR REPLACE FUNCTION public.registrar_mudanca_membro()
RETURNS TRIGGER AS $$
BEGIN
  -- Mudança de papel
  IF OLD.papel IS DISTINCT FROM NEW.papel THEN
    INSERT INTO public.historico_membros_equipe (
      equipe_id,
      usuario_id,
      tipo_evento,
      papel_anterior,
      papel_novo,
      realizado_por
    ) VALUES (
      NEW.equipe_id,
      NEW.usuario_id,
      'mudanca_papel',
      OLD.papel,
      NEW.papel,
      auth.uid()
    );
  END IF;
  
  -- Mudança de carga de trabalho
  IF OLD.carga_trabalho IS DISTINCT FROM NEW.carga_trabalho THEN
    INSERT INTO public.historico_membros_equipe (
      equipe_id,
      usuario_id,
      tipo_evento,
      carga_trabalho_anterior,
      carga_trabalho_nova,
      realizado_por
    ) VALUES (
      NEW.equipe_id,
      NEW.usuario_id,
      'mudanca_carga',
      OLD.carga_trabalho,
      NEW.carga_trabalho,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_registrar_mudanca_membro
AFTER UPDATE ON public.membros_equipe
FOR EACH ROW
EXECUTE FUNCTION public.registrar_mudanca_membro();

-- Função para transferir membro entre equipes
CREATE OR REPLACE FUNCTION public.transferir_membro_equipe(
  _usuario_id UUID,
  _equipe_origem_id UUID,
  _equipe_destino_id UUID,
  _manter_papel BOOLEAN DEFAULT false,
  _novo_papel VARCHAR DEFAULT NULL,
  _motivo TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  _papel_atual VARCHAR;
  _carga_atual INTEGER;
  _dias_equipe_origem INTEGER;
BEGIN
  -- Verificar permissões
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Você não tem permissão para transferir membros entre equipes';
  END IF;

  -- Buscar dados atuais do membro
  SELECT papel, carga_trabalho, EXTRACT(DAY FROM (NOW() - entrou_em))
  INTO _papel_atual, _carga_atual, _dias_equipe_origem
  FROM membros_equipe
  WHERE usuario_id = _usuario_id AND equipe_id = _equipe_origem_id AND esta_ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado na equipe de origem';
  END IF;

  -- Marcar saída da equipe origem
  UPDATE membros_equipe
  SET 
    saiu_em = NOW(),
    esta_ativo = false,
    motivo_saida = COALESCE(_motivo, 'Transferência para outra equipe')
  WHERE usuario_id = _usuario_id AND equipe_id = _equipe_origem_id;

  -- Adicionar na equipe destino
  INSERT INTO membros_equipe (
    equipe_id,
    usuario_id,
    papel,
    carga_trabalho,
    nivel_acesso,
    observacoes
  ) VALUES (
    _equipe_destino_id,
    _usuario_id,
    CASE WHEN _manter_papel THEN _papel_atual ELSE _novo_papel END,
    _carga_atual,
    'padrao',
    _motivo
  );

  -- Registrar transferência no histórico
  INSERT INTO public.historico_membros_equipe (
    equipe_id,
    usuario_id,
    tipo_evento,
    equipe_origem_id,
    equipe_destino_id,
    papel_anterior,
    papel_novo,
    motivo,
    dias_na_equipe,
    realizado_por
  ) VALUES (
    _equipe_destino_id,
    _usuario_id,
    'transferencia_destino',
    _equipe_origem_id,
    _equipe_destino_id,
    _papel_atual,
    CASE WHEN _manter_papel THEN _papel_atual ELSE _novo_papel END,
    _motivo,
    _dias_equipe_origem,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Membro transferido com sucesso',
    'dias_equipe_origem', _dias_equipe_origem
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.transferir_membro_equipe IS 'Transfere um membro de uma equipe para outra, mantendo histórico completo';

-- View para relatório de turnover
CREATE OR REPLACE VIEW public.vw_turnover_equipes AS
SELECT 
  e.id as equipe_id,
  e.nome as equipe_nome,
  COUNT(DISTINCT CASE WHEN me.esta_ativo = true THEN me.usuario_id END) as membros_ativos,
  COUNT(DISTINCT CASE WHEN me.saiu_em IS NOT NULL THEN me.usuario_id END) as membros_saidos,
  COUNT(DISTINCT me.usuario_id) as total_membros_historico,
  ROUND(
    COUNT(DISTINCT CASE WHEN me.saiu_em IS NOT NULL THEN me.usuario_id END)::numeric / 
    NULLIF(COUNT(DISTINCT me.usuario_id), 0) * 100, 
    2
  ) as taxa_turnover_percent,
  AVG(CASE WHEN me.saiu_em IS NOT NULL 
    THEN EXTRACT(DAY FROM (me.saiu_em - me.entrou_em)) 
    END) as tempo_medio_permanencia_dias
FROM equipes e
LEFT JOIN membros_equipe me ON me.equipe_id = e.id
WHERE e.esta_ativa = true
GROUP BY e.id, e.nome;

COMMENT ON VIEW public.vw_turnover_equipes IS 'Estatísticas de turnover por equipe';