-- Atualizar a lógica de recálculo de metas para aceitar status 'aprovada' também
CREATE OR REPLACE FUNCTION recalcular_valor_meta_vendas(
  _meta_id UUID
)
RETURNS VOID AS $$
DECLARE
  _meta RECORD;
  _valor_atual NUMERIC;
  _valor_anterior NUMERIC;
BEGIN
  -- Buscar informações da meta
  SELECT * INTO _meta
  FROM metas_equipe
  WHERE id = _meta_id
    AND tipo_meta = 'vendas'
    AND status = 'ativa';
    
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular valor atual baseado em vendas EFETIVADAS no período
  -- Usa aprovado_em (data de aprovação/efetivação) não data_venda (data de criação)
  -- Aceita status 'aprovada', 'concluida' ou 'faturada'
  SELECT COALESCE(SUM(v.valor_final), 0) INTO _valor_atual
  FROM vendas v
  WHERE v.equipe_id = _meta.equipe_id
    AND v.aprovado_em IS NOT NULL -- Apenas vendas aprovadas
    AND v.aprovado_em >= _meta.periodo_inicio -- Usa data de aprovação
    AND v.aprovado_em <= _meta.periodo_fim -- Usa data de aprovação
    AND v.status IN ('aprovada', 'concluida', 'faturada'); -- Qualquer status de venda finalizada
    
  -- Guardar valor anterior
  _valor_anterior := _meta.valor_atual;
  
  -- Atualizar valor atual da meta
  UPDATE metas_equipe
  SET 
    valor_atual = _valor_atual,
    atualizado_em = NOW(),
    -- Atualizar status automaticamente se meta foi atingida
    status = CASE 
      WHEN _valor_atual >= valor_objetivo AND periodo_fim >= CURRENT_DATE THEN 'concluida'
      WHEN _valor_atual >= valor_objetivo AND periodo_fim < CURRENT_DATE THEN 'concluida'
      ELSE status
    END,
    concluido_em = CASE
      WHEN _valor_atual >= valor_objetivo AND concluido_em IS NULL THEN NOW()
      ELSE concluido_em
    END
  WHERE id = _meta_id;
  
  -- Registrar progresso se houver mudança
  IF _valor_atual != _valor_anterior THEN
    INSERT INTO progresso_metas (
      meta_id,
      valor_anterior,
      valor_novo,
      origem,
      observacao
    ) VALUES (
      _meta_id,
      _valor_anterior,
      _valor_atual,
      'automatico',
      'Atualização automática baseada em vendas efetivadas (aprovado_em) no período'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION recalcular_valor_meta_vendas IS 
'Recalcula valor de meta baseado em vendas EFETIVADAS (aprovado_em) no período. Considera vendas com aprovado_em preenchido e status aprovada, concluida ou faturada.';