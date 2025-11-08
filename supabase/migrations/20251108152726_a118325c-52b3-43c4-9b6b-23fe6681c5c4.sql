-- Criar tabela de histórico de atividades das equipes
CREATE TABLE IF NOT EXISTS public.historico_atividades_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id),
  tipo_atividade VARCHAR(50) NOT NULL, -- 'criacao', 'edicao', 'desativacao', 'reativacao', 'adicao_membro', 'remocao_membro', 'transferencia_lideranca'
  descricao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  realizado_por UUID REFERENCES auth.users(id),
  realizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_historico_atividades_equipe_equipe_id ON public.historico_atividades_equipe(equipe_id);
CREATE INDEX idx_historico_atividades_equipe_tipo ON public.historico_atividades_equipe(tipo_atividade);
CREATE INDEX idx_historico_atividades_equipe_realizado_em ON public.historico_atividades_equipe(realizado_em DESC);

-- RLS Policies
ALTER TABLE public.historico_atividades_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar histórico"
  ON public.historico_atividades_equipe
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode inserir histórico"
  ON public.historico_atividades_equipe
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para registrar automaticamente edições de equipes
CREATE OR REPLACE FUNCTION public.registrar_edicao_equipe()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.nome IS DISTINCT FROM NEW.nome OR 
      OLD.descricao IS DISTINCT FROM NEW.descricao OR 
      OLD.tipo_equipe IS DISTINCT FROM NEW.tipo_equipe OR
      OLD.lider_equipe_id IS DISTINCT FROM NEW.lider_equipe_id) THEN
    
    INSERT INTO public.historico_atividades_equipe (
      equipe_id,
      tipo_atividade,
      descricao,
      dados_anteriores,
      dados_novos,
      realizado_por
    ) VALUES (
      NEW.id,
      'edicao',
      'Equipe editada',
      jsonb_build_object(
        'nome', OLD.nome,
        'descricao', OLD.descricao,
        'tipo_equipe', OLD.tipo_equipe,
        'lider_equipe_id', OLD.lider_equipe_id
      ),
      jsonb_build_object(
        'nome', NEW.nome,
        'descricao', NEW.descricao,
        'tipo_equipe', NEW.tipo_equipe,
        'lider_equipe_id', NEW.lider_equipe_id
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_registrar_edicao_equipe
AFTER UPDATE ON public.equipes
FOR EACH ROW
EXECUTE FUNCTION public.registrar_edicao_equipe();

-- Trigger para registrar desativação/reativação
CREATE OR REPLACE FUNCTION public.registrar_ativacao_equipe()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.esta_ativa IS DISTINCT FROM NEW.esta_ativa THEN
    INSERT INTO public.historico_atividades_equipe (
      equipe_id,
      tipo_atividade,
      descricao,
      dados_anteriores,
      dados_novos,
      realizado_por
    ) VALUES (
      NEW.id,
      CASE WHEN NEW.esta_ativa THEN 'reativacao' ELSE 'desativacao' END,
      CASE WHEN NEW.esta_ativa THEN 'Equipe reativada' ELSE 'Equipe desativada' END,
      jsonb_build_object('esta_ativa', OLD.esta_ativa),
      jsonb_build_object('esta_ativa', NEW.esta_ativa),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_registrar_ativacao_equipe
AFTER UPDATE ON public.equipes
FOR EACH ROW
EXECUTE FUNCTION public.registrar_ativacao_equipe();