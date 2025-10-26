-- Reforçar aprendizado com penalidade forte para rejeições
CREATE OR REPLACE FUNCTION public.ajustar_score_aprendizado(
  p_produto_id UUID,
  p_feedback_tipo VARCHAR,
  p_score_original NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_ajuste NUMERIC;
  v_motivo TEXT;
BEGIN
  -- Penalidades/bonificações mais fortes para aprendizado efetivo
  CASE p_feedback_tipo
    WHEN 'aceito' THEN
      v_ajuste := 10;  -- antes: 5
      v_motivo := 'Sugestão aceita pelo vendedor';
    WHEN 'rejeitado' THEN
      v_ajuste := -60; -- antes: -10 (aumenta penalidade para evitar repetição)
      v_motivo := 'Sugestão rejeitada pelo vendedor';
    WHEN 'modificado' THEN
      v_ajuste := -20; -- antes: -3
      v_motivo := 'Sugestão aceita com modificações';
    ELSE
      v_ajuste := 0;
      v_motivo := 'Sem ajuste';
  END CASE;

  INSERT INTO public.ia_score_ajustes (
    produto_id,
    motivo_ajuste,
    ajuste_score,
    feedback_origem,
    score_anterior,
    ativo
  ) VALUES (
    p_produto_id,
    v_motivo,
    v_ajuste,
    p_feedback_tipo,
    p_score_original,
    true
  );

  RAISE NOTICE 'Score ajustado: produto_id=%, ajuste=%, motivo=%', p_produto_id, v_ajuste, v_motivo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;