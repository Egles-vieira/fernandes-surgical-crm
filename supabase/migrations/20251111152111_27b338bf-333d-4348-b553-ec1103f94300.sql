-- ============================================
-- FASE 2: SOMA AUTOMÁTICA DE METAS
-- ============================================

-- Etapa 2.1: Criar View de Agregação de Metas por Equipe
CREATE OR REPLACE VIEW vw_soma_metas_vendedores_equipe AS
SELECT 
  mv.equipe_id,
  mv.periodo_inicio,
  mv.periodo_fim,
  COUNT(DISTINCT mv.vendedor_id) as total_vendedores,
  SUM(mv.meta_valor) as total_meta_valor,
  SUM(mv.valor_atual) as total_realizado_valor,
  SUM(mv.meta_unidades) as total_meta_unidades,
  SUM(mv.unidades_atual) as total_realizado_unidades,
  AVG(mv.meta_margem) as meta_margem_media,
  AVG(mv.margem_atual) as margem_atual_media,
  AVG(mv.meta_conversao) as meta_conversao_media,
  AVG(mv.conversao_atual) as conversao_atual_media,
  CASE 
    WHEN SUM(mv.meta_valor) > 0 THEN 
      (SUM(mv.valor_atual) / SUM(mv.meta_valor)) * 100
    ELSE 0
  END as percentual_atingimento,
  CASE
    WHEN COUNT(CASE WHEN mv.status = 'ativa' THEN 1 END) > 0 THEN 'ativa'
    WHEN COUNT(CASE WHEN mv.status = 'concluida' THEN 1 END) = COUNT(*) THEN 'concluida'
    WHEN mv.periodo_fim < CURRENT_DATE THEN 'vencida'
    ELSE 'cancelada'
  END as status_geral
FROM metas_vendedor mv
WHERE mv.equipe_id IS NOT NULL
GROUP BY mv.equipe_id, mv.periodo_inicio, mv.periodo_fim;

-- Permitir acesso à view
GRANT SELECT ON vw_soma_metas_vendedores_equipe TO authenticated;

-- Etapa 2.2: Criar Função de Sincronização de Metas
CREATE OR REPLACE FUNCTION sync_metas_equipe_from_vendedores()
RETURNS TRIGGER AS $$
DECLARE
  v_equipe_id UUID;
  v_periodo_inicio DATE;
  v_periodo_fim DATE;
  v_meta_existente UUID;
  v_total_meta_valor NUMERIC;
  v_total_realizado_valor NUMERIC;
  v_total_vendedores INT;
BEGIN
  -- Determinar a equipe_id do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_equipe_id := OLD.equipe_id;
    v_periodo_inicio := OLD.periodo_inicio::DATE;
    v_periodo_fim := OLD.periodo_fim::DATE;
  ELSE
    v_equipe_id := NEW.equipe_id;
    v_periodo_inicio := NEW.periodo_inicio::DATE;
    v_periodo_fim := NEW.periodo_fim::DATE;
  END IF;

  -- Se não houver equipe_id, não faz nada
  IF v_equipe_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Buscar totais agregados da view
  SELECT 
    total_meta_valor,
    total_realizado_valor,
    total_vendedores
  INTO 
    v_total_meta_valor,
    v_total_realizado_valor,
    v_total_vendedores
  FROM vw_soma_metas_vendedores_equipe
  WHERE 
    equipe_id = v_equipe_id
    AND periodo_inicio = v_periodo_inicio
    AND periodo_fim = v_periodo_fim;

  -- Se não houver mais metas de vendedores neste período, cancela a meta da equipe
  IF v_total_vendedores IS NULL OR v_total_vendedores = 0 THEN
    UPDATE metas_equipe
    SET 
      status = 'cancelada',
      motivo_cancelamento = 'Todas as metas dos vendedores foram removidas',
      cancelado_em = NOW()
    WHERE 
      equipe_id = v_equipe_id
      AND periodo_inicio = v_periodo_inicio
      AND periodo_fim = v_periodo_fim
      AND tipo_meta = 'agregada'
      AND status = 'ativa';
    
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar se já existe uma meta agregada para esta equipe e período
  SELECT id INTO v_meta_existente
  FROM metas_equipe
  WHERE 
    equipe_id = v_equipe_id
    AND periodo_inicio = v_periodo_inicio
    AND periodo_fim = v_periodo_fim
    AND tipo_meta = 'agregada'
  LIMIT 1;

  -- Se existir, atualiza
  IF v_meta_existente IS NOT NULL THEN
    UPDATE metas_equipe
    SET 
      valor_objetivo = v_total_meta_valor,
      valor_atual = v_total_realizado_valor,
      atualizado_em = NOW()
    WHERE id = v_meta_existente;
  ELSE
    -- Se não existir, cria nova meta agregada
    INSERT INTO metas_equipe (
      equipe_id,
      nome,
      descricao,
      tipo_meta,
      metrica,
      unidade_medida,
      valor_objetivo,
      valor_atual,
      periodo_inicio,
      periodo_fim,
      status,
      prioridade,
      criado_por
    ) VALUES (
      v_equipe_id,
      'Meta Agregada de Vendas',
      'Meta gerada automaticamente pela soma das metas individuais dos vendedores',
      'agregada',
      'vendas',
      'R$',
      v_total_meta_valor,
      v_total_realizado_valor,
      v_periodo_inicio,
      v_periodo_fim,
      'ativa',
      'alta',
      auth.uid()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Etapa 2.3: Criar Trigger de Sincronização
DROP TRIGGER IF EXISTS trg_sync_metas_equipe ON metas_vendedor;

CREATE TRIGGER trg_sync_metas_equipe
  AFTER INSERT OR UPDATE OR DELETE ON metas_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION sync_metas_equipe_from_vendedores();

-- Comentários para documentação
COMMENT ON VIEW vw_soma_metas_vendedores_equipe IS 
'View agregada que soma todas as metas dos vendedores por equipe e período';

COMMENT ON FUNCTION sync_metas_equipe_from_vendedores() IS 
'Função que sincroniza automaticamente as metas da equipe baseado nas metas dos vendedores';

COMMENT ON TRIGGER trg_sync_metas_equipe ON metas_vendedor IS 
'Trigger que mantém metas da equipe sincronizadas com as metas dos vendedores';