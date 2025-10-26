-- Remover versões antigas/duplicadas da função para evitar ambiguidade
DROP FUNCTION IF EXISTS public.registrar_feedback_ia(uuid, uuid, uuid, text, integer);
DROP FUNCTION IF EXISTS public.registrar_feedback_ia(uuid, uuid, uuid, character varying, integer);
-- Manter a assinatura original com p_score_ia numeric
DROP FUNCTION IF EXISTS public.registrar_feedback_ia(uuid, uuid, uuid, character varying, numeric);

-- Criar função corrigida com colunas corretas e cálculo de foi_aceito
CREATE OR REPLACE FUNCTION public.registrar_feedback_ia(
  p_item_id uuid,
  p_produto_sugerido_id uuid,
  p_produto_escolhido_id uuid,
  p_feedback_tipo varchar,
  p_score_ia numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;