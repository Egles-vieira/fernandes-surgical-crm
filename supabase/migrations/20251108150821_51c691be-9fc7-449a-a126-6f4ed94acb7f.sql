-- Criar tabela para histórico de mudanças de liderança
CREATE TABLE IF NOT EXISTS public.historico_lideranca_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  lider_anterior_id UUID REFERENCES auth.users(id),
  lider_novo_id UUID NOT NULL REFERENCES auth.users(id),
  motivo TEXT,
  alterado_por UUID NOT NULL REFERENCES auth.users(id),
  alterado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_lideranca_equipe ENABLE ROW LEVEL SECURITY;

-- Política para admins e líderes visualizarem histórico
CREATE POLICY "Admins e líderes podem ver histórico de liderança"
ON public.historico_lideranca_equipe
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'lider'::app_role]) OR
  lider_anterior_id = auth.uid() OR
  lider_novo_id = auth.uid()
);

-- Política para sistema inserir histórico
CREATE POLICY "Sistema pode inserir histórico de liderança"
ON public.historico_lideranca_equipe
FOR INSERT
TO authenticated
WITH CHECK (
  alterado_por = auth.uid() AND
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'lider'::app_role])
);

-- Criar índices para melhor performance
CREATE INDEX idx_historico_lideranca_equipe_id ON public.historico_lideranca_equipe(equipe_id);
CREATE INDEX idx_historico_lideranca_alterado_em ON public.historico_lideranca_equipe(alterado_em DESC);

-- Função para transferir liderança com validações
CREATE OR REPLACE FUNCTION public.transferir_lideranca_equipe(
  _equipe_id UUID,
  _novo_lider_id UUID,
  _motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lider_anterior_id UUID;
  _equipe_nome TEXT;
  _novo_lider_eh_membro BOOLEAN;
BEGIN
  -- Verificar se usuário tem permissão (admin ou líder)
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'lider'::app_role]) THEN
    RAISE EXCEPTION 'Você não tem permissão para transferir liderança';
  END IF;

  -- Buscar dados da equipe
  SELECT lider_equipe_id, nome INTO _lider_anterior_id, _equipe_nome
  FROM equipes
  WHERE id = _equipe_id AND excluido_em IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipe não encontrada';
  END IF;

  -- Verificar se o novo líder é diferente do anterior
  IF _lider_anterior_id = _novo_lider_id THEN
    RAISE EXCEPTION 'O novo líder já é o líder atual da equipe';
  END IF;

  -- Verificar se o novo líder é membro da equipe
  SELECT EXISTS(
    SELECT 1 FROM membros_equipe
    WHERE equipe_id = _equipe_id AND usuario_id = _novo_lider_id
  ) INTO _novo_lider_eh_membro;

  IF NOT _novo_lider_eh_membro THEN
    RAISE EXCEPTION 'O novo líder deve ser membro da equipe antes da transferência';
  END IF;

  -- Atualizar o líder da equipe
  UPDATE equipes
  SET 
    lider_equipe_id = _novo_lider_id,
    atualizado_em = now()
  WHERE id = _equipe_id;

  -- Registrar no histórico
  INSERT INTO historico_lideranca_equipe (
    equipe_id,
    lider_anterior_id,
    lider_novo_id,
    motivo,
    alterado_por
  ) VALUES (
    _equipe_id,
    _lider_anterior_id,
    _novo_lider_id,
    _motivo,
    auth.uid()
  );

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Liderança transferida com sucesso',
    'equipe_nome', _equipe_nome,
    'lider_anterior_id', _lider_anterior_id,
    'novo_lider_id', _novo_lider_id
  );
END;
$$;