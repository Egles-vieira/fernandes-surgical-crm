-- Fix sync function to align with metas_equipe schema (tipo_meta allowed values)
-- Use 'vendas' as tipo_meta and 'valor_total' as metrica; identify aggregated rows by nome constant

CREATE OR REPLACE FUNCTION public.sync_metas_equipe_from_vendedores()
RETURNS TRIGGER AS $$
DECLARE
  v_equipe_id UUID;
  v_periodo_inicio DATE;
  v_periodo_fim DATE;
  v_meta_existente UUID;
  v_total_meta_valor NUMERIC;
  v_total_realizado_valor NUMERIC;
  v_total_vendedores INT;
  v_nome_constante TEXT := 'Meta Agregada de Vendas';
BEGIN
  -- Determinar a equipe_id e período do registro afetado
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
  FROM public.vw_soma_metas_vendedores_equipe
  WHERE 
    equipe_id = v_equipe_id
    AND periodo_inicio = v_periodo_inicio
    AND periodo_fim = v_periodo_fim;

  -- Se não houver mais metas de vendedores neste período, cancela a meta de equipe agregada
  IF v_total_vendedores IS NULL OR v_total_vendedores = 0 THEN
    UPDATE public.metas_equipe
    SET 
      status = 'cancelada',
      motivo_cancelamento = 'Todas as metas dos vendedores foram removidas',
      cancelado_em = NOW(),
      atualizado_em = NOW()
    WHERE 
      equipe_id = v_equipe_id
      AND periodo_inicio = v_periodo_inicio
      AND periodo_fim = v_periodo_fim
      AND nome = v_nome_constante
      AND status = 'ativa';

    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar se já existe uma meta agregada para esta equipe e período (identificada pelo nome constante)
  SELECT id INTO v_meta_existente
  FROM public.metas_equipe
  WHERE 
    equipe_id = v_equipe_id
    AND periodo_inicio = v_periodo_inicio
    AND periodo_fim = v_periodo_fim
    AND nome = v_nome_constante
  LIMIT 1;

  -- Se existir, atualiza
  IF v_meta_existente IS NOT NULL THEN
    UPDATE public.metas_equipe
    SET 
      valor_objetivo = COALESCE(v_total_meta_valor, 0),
      valor_atual = COALESCE(v_total_realizado_valor, 0),
      atualizado_em = NOW()
    WHERE id = v_meta_existente;
  ELSE
    -- Se não existir, cria nova meta agregada, usando tipo_meta permitido e metrica padronizada
    INSERT INTO public.metas_equipe (
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
      v_nome_constante,
      'Meta gerada automaticamente pela soma das metas individuais dos vendedores',
      'vendas',          -- tipo válido segundo o CHECK constraint
      'valor_total',     -- métrica padronizada
      'R$',
      COALESCE(v_total_meta_valor, 0),
      COALESCE(v_total_realizado_valor, 0),
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

-- Garantir que o trigger aponte para a função atualizada (idempotente)
DROP TRIGGER IF EXISTS trg_sync_metas_equipe ON public.metas_vendedor;
CREATE TRIGGER trg_sync_metas_equipe
  AFTER INSERT OR UPDATE OR DELETE ON public.metas_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_metas_equipe_from_vendedores();