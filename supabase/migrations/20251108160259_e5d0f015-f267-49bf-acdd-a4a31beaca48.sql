-- Função para recalcular valor atual da meta baseado em vendas do período
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
  
  -- Calcular valor atual baseado em vendas do período da equipe
  SELECT COALESCE(SUM(v.valor_final), 0) INTO _valor_atual
  FROM vendas v
  WHERE v.equipe_id = _meta.equipe_id
    AND v.data_venda >= _meta.periodo_inicio
    AND v.data_venda <= _meta.periodo_fim
    AND v.status IN ('aprovada', 'concluida', 'faturada');
    
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
      'Atualização automática baseada em vendas do período'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger para atualizar metas de vendas automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_meta_vendas ON vendas;
DROP FUNCTION IF EXISTS atualizar_meta_vendas_trigger();

CREATE OR REPLACE FUNCTION atualizar_meta_vendas_trigger()
RETURNS TRIGGER AS $$
DECLARE
  _meta RECORD;
BEGIN
  -- Buscar metas de vendas ativas da equipe que incluem essa venda no período
  FOR _meta IN 
    SELECT id
    FROM metas_equipe
    WHERE tipo_meta = 'vendas'
      AND status = 'ativa'
      AND equipe_id = NEW.equipe_id
      AND NEW.data_venda >= periodo_inicio
      AND NEW.data_venda <= periodo_fim
  LOOP
    -- Recalcular valor da meta
    PERFORM recalcular_valor_meta_vendas(_meta.id);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_meta_vendas
  AFTER INSERT OR UPDATE OF valor_final, status, data_venda, equipe_id
  ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_meta_vendas_trigger();

-- Função para recalcular todas as metas de vendas (útil para manutenção)
CREATE OR REPLACE FUNCTION recalcular_todas_metas_vendas()
RETURNS INTEGER AS $$
DECLARE
  _meta RECORD;
  _contador INTEGER := 0;
BEGIN
  FOR _meta IN 
    SELECT id
    FROM metas_equipe
    WHERE tipo_meta = 'vendas'
      AND status = 'ativa'
  LOOP
    PERFORM recalcular_valor_meta_vendas(_meta.id);
    _contador := _contador + 1;
  END LOOP;
  
  RETURN _contador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;