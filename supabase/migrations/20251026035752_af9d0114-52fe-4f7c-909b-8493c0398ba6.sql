-- Corrigir função registrar_feedback_ia para usar nome correto da coluna
CREATE OR REPLACE FUNCTION registrar_feedback_ia(
  p_item_id UUID,
  p_produto_sugerido_id UUID,
  p_produto_escolhido_id UUID,
  p_feedback_tipo TEXT,
  p_score_ia INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Registrar no histórico
  INSERT INTO ia_feedback_historico (
    cotacao_item_id,
    produto_sugerido_id,
    produto_escolhido_id,
    feedback_tipo,
    score_original,
    criado_por
  ) VALUES (
    p_item_id,
    p_produto_sugerido_id,
    p_produto_escolhido_id,
    p_feedback_tipo,
    p_score_ia,
    auth.uid()
  );

  -- Atualizar item com feedback
  UPDATE edi_cotacoes_itens 
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