-- Garantir que tabela ia_feedback_historico existe e está correta
CREATE TABLE IF NOT EXISTS public.ia_feedback_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_item_id UUID NOT NULL REFERENCES public.edi_cotacoes_itens(id) ON DELETE CASCADE,
  produto_sugerido_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_correto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  tipo_feedback VARCHAR NOT NULL CHECK (tipo_feedback IN ('aceito', 'rejeitado', 'modificado')),
  foi_aceito BOOLEAN NOT NULL DEFAULT false,
  score_original NUMERIC(5,2),
  comentario TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_feedback_item ON public.ia_feedback_historico(cotacao_item_id);
CREATE INDEX IF NOT EXISTS idx_feedback_produto_sugerido ON public.ia_feedback_historico(produto_sugerido_id);
CREATE INDEX IF NOT EXISTS idx_feedback_usuario ON public.ia_feedback_historico(usuario_id);
CREATE INDEX IF NOT EXISTS idx_feedback_criado ON public.ia_feedback_historico(criado_em DESC);

-- RLS para ia_feedback_historico
ALTER TABLE public.ia_feedback_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem inserir feedback" ON public.ia_feedback_historico;
CREATE POLICY "Usuários podem inserir feedback" ON public.ia_feedback_historico
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários podem ver feedback" ON public.ia_feedback_historico;
CREATE POLICY "Usuários podem ver feedback" ON public.ia_feedback_historico
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Adicionar campos de erro em edi_cotacoes_itens se não existirem
ALTER TABLE public.edi_cotacoes_itens 
  ADD COLUMN IF NOT EXISTS erro_analise_ia TEXT;

-- Adicionar campo de erro em edi_cotacoes se não existir  
ALTER TABLE public.edi_cotacoes 
  ADD COLUMN IF NOT EXISTS erro_analise_ia TEXT;

-- Atualizar função registrar_feedback_ia para garantir que funciona corretamente
CREATE OR REPLACE FUNCTION public.registrar_feedback_ia(
  p_item_id UUID,
  p_produto_sugerido_id UUID,
  p_produto_escolhido_id UUID,
  p_feedback_tipo VARCHAR,
  p_score_ia NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Inserir histórico com nomes de colunas corretos e foi_aceito derivado
  INSERT INTO public.ia_feedback_historico (
    cotacao_item_id,
    produto_sugerido_id,
    produto_correto_id,
    tipo_feedback,
    foi_aceito,
    score_original,
    usuario_id
  ) VALUES (
    p_item_id,
    p_produto_sugerido_id,
    p_produto_escolhido_id,
    p_feedback_tipo,
    (p_feedback_tipo = 'aceito'),
    p_score_ia,
    auth.uid()
  );

  -- Atualizar o item da cotação com o feedback
  UPDATE public.edi_cotacoes_itens 
  SET 
    feedback_vendedor = p_feedback_tipo,
    feedback_vendedor_em = NOW(),
    produto_aceito_ia_id = CASE 
      WHEN p_feedback_tipo = 'aceito' THEN p_produto_sugerido_id 
      ELSE NULL 
    END
  WHERE id = p_item_id;

  RAISE NOTICE 'Feedback registrado: item=%, tipo=%, produto=%', 
    p_item_id, p_feedback_tipo, p_produto_sugerido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comentários para documentação
COMMENT ON TABLE public.ia_feedback_historico IS 'Histórico de feedback dos vendedores sobre sugestões da IA para Machine Learning';
COMMENT ON COLUMN public.ia_feedback_historico.foi_aceito IS 'Se a sugestão da IA foi aceita pelo vendedor';
COMMENT ON COLUMN public.ia_feedback_historico.tipo_feedback IS 'Tipo de feedback: aceito, rejeitado ou modificado';
COMMENT ON COLUMN public.ia_feedback_historico.score_original IS 'Score original da IA no momento da sugestão';
