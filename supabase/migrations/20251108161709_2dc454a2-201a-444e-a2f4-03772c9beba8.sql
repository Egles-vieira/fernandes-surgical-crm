-- Corrigir função para usar aprovado_em como data de efetivação
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
  SELECT COALESCE(SUM(v.valor_final), 0) INTO _valor_atual
  FROM vendas v
  WHERE v.equipe_id = _meta.equipe_id
    AND v.aprovado_em IS NOT NULL -- Apenas vendas aprovadas
    AND v.aprovado_em >= _meta.periodo_inicio -- Usa data de aprovação
    AND v.aprovado_em <= _meta.periodo_fim -- Usa data de aprovação
    AND v.status IN ('concluida', 'faturada'); -- Apenas vendas finalizadas
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalcular_valor_meta_vendas IS 
'Recalcula valor de meta baseado em vendas EFETIVADAS (aprovado_em) no período. Considera apenas vendas com aprovado_em preenchido e status concluida ou faturada.';

-- Corrigir trigger para disparar quando venda é aprovada (aprovado_em preenchido)
DROP TRIGGER IF EXISTS trigger_atualizar_meta_vendas ON vendas;
DROP FUNCTION IF EXISTS atualizar_meta_vendas_trigger();

CREATE OR REPLACE FUNCTION atualizar_meta_vendas_trigger()
RETURNS TRIGGER AS $$
DECLARE
  _meta RECORD;
BEGIN
  -- Apenas processar se a venda foi efetivamente aprovada
  IF NEW.aprovado_em IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar metas de vendas ativas da equipe que incluem essa venda no período
  FOR _meta IN 
    SELECT id
    FROM metas_equipe
    WHERE tipo_meta = 'vendas'
      AND status = 'ativa'
      AND equipe_id = NEW.equipe_id
      AND NEW.aprovado_em >= periodo_inicio -- Usa aprovado_em
      AND NEW.aprovado_em <= periodo_fim -- Usa aprovado_em
  LOOP
    -- Recalcular valor da meta
    PERFORM recalcular_valor_meta_vendas(_meta.id);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION atualizar_meta_vendas_trigger IS 
'Trigger que atualiza metas quando uma venda é APROVADA (aprovado_em preenchido). Dispara em INSERT ou UPDATE de aprovado_em, status, valor_final ou equipe_id.';

-- Recriar trigger para disparar nas colunas corretas
CREATE TRIGGER trigger_atualizar_meta_vendas
  AFTER INSERT OR UPDATE OF aprovado_em, status, valor_final, equipe_id
  ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_meta_vendas_trigger();

-- Função para recalcular todas as metas (útil para correção de dados históricos)
CREATE OR REPLACE FUNCTION recalcular_metas_correcao()
RETURNS TABLE(
  metas_recalculadas INTEGER,
  metas_concluidas INTEGER
) AS $$
DECLARE
  _meta RECORD;
  _contador INTEGER := 0;
  _concluidas INTEGER := 0;
  _status_anterior TEXT;
BEGIN
  FOR _meta IN 
    SELECT id, status
    FROM metas_equipe
    WHERE tipo_meta = 'vendas'
      AND status IN ('ativa', 'concluida')
  LOOP
    _status_anterior := _meta.status;
    PERFORM recalcular_valor_meta_vendas(_meta.id);
    _contador := _contador + 1;
    
    -- Verificar se meta foi concluída
    SELECT status INTO _status_anterior
    FROM metas_equipe
    WHERE id = _meta.id;
    
    IF _status_anterior = 'concluida' THEN
      _concluidas := _concluidas + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT _contador, _concluidas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalcular_metas_correcao IS 
'Recalcula todas as metas de vendas ativas usando a lógica corrigida (aprovado_em). Útil para corrigir dados históricos após mudança de lógica.';