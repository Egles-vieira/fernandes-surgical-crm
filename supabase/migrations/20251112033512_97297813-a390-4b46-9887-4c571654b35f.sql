-- ============================================================================
-- FASE 1: Criar função para recalcular metas de vendedor individuais
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalcular_valor_meta_vendedor(_meta_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meta RECORD;
  _valor_atual NUMERIC;
  _valor_anterior NUMERIC;
BEGIN
  -- Buscar meta ativa
  SELECT * INTO _meta 
  FROM metas_vendedor 
  WHERE id = _meta_id AND status = 'ativa';
  
  IF NOT FOUND THEN 
    RAISE NOTICE 'Meta % não encontrada ou não está ativa', _meta_id;
    RETURN; 
  END IF;
  
  -- Calcular valor atual somando vendas aprovadas do vendedor no período
  SELECT COALESCE(SUM(v.valor_final), 0) INTO _valor_atual
  FROM vendas v
  WHERE (v.vendedor_id = _meta.vendedor_id OR v.responsavel_id = _meta.vendedor_id)
    AND v.aprovado_em IS NOT NULL
    AND v.aprovado_em >= _meta.periodo_inicio
    AND v.aprovado_em <= _meta.periodo_fim
    AND v.status IN ('aprovada', 'concluida', 'faturada');
  
  _valor_anterior := COALESCE(_meta.valor_atual, 0);
  
  RAISE NOTICE 'Meta vendedor %: valor anterior %, novo valor %', 
    _meta.vendedor_id, _valor_anterior, _valor_atual;
  
  -- Atualizar meta
  UPDATE metas_vendedor 
  SET 
    valor_atual = _valor_atual,
    atualizado_em = now()
  WHERE id = _meta_id;
END;
$$;

COMMENT ON FUNCTION public.recalcular_valor_meta_vendedor IS 
'Recalcula o valor atual de uma meta individual de vendedor baseado nas vendas aprovadas no período';

-- ============================================================================
-- FASE 2: Atualizar trigger para incluir atualização de metas de vendedor
-- ============================================================================

CREATE OR REPLACE FUNCTION public.atualizar_meta_vendas_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meta RECORD;
  _equipe_id UUID;
  _vendedor_id UUID;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Trigger atualizar_meta_vendas: venda_id=%, aprovado_em=%, status=%', 
    NEW.id, NEW.aprovado_em, NEW.status;
  
  -- Validar que venda foi aprovada
  IF NEW.aprovado_em IS NULL THEN 
    RAISE NOTICE 'Venda % não aprovada, ignorando trigger', NEW.id;
    RETURN NEW; 
  END IF;
  
  -- Preencher equipe_id se NULL
  _equipe_id := NEW.equipe_id;
  _vendedor_id := COALESCE(NEW.vendedor_id, NEW.responsavel_id);
  
  IF _equipe_id IS NULL AND _vendedor_id IS NOT NULL THEN
    -- Buscar equipe ativa do vendedor
    SELECT me.equipe_id INTO _equipe_id
    FROM membros_equipe me
    INNER JOIN equipes e ON e.id = me.equipe_id
    WHERE me.usuario_id = _vendedor_id
      AND me.esta_ativo = true
      AND e.esta_ativa = true
    LIMIT 1;
    
    IF _equipe_id IS NOT NULL THEN 
      NEW.equipe_id := _equipe_id;
      RAISE NOTICE 'Preenchido equipe_id=% para venda %', _equipe_id, NEW.id;
    ELSE
      RAISE WARNING 'Vendedor % não possui equipe ativa', _vendedor_id;
    END IF;
  END IF;
  
  -- ========================================================================
  -- Atualizar METAS DE EQUIPE (tipo 'vendas')
  -- ========================================================================
  IF NEW.equipe_id IS NOT NULL THEN
    FOR _meta IN 
      SELECT id 
      FROM metas_equipe 
      WHERE equipe_id = NEW.equipe_id
        AND tipo_meta = 'vendas'
        AND status = 'ativa'
        AND NEW.aprovado_em >= periodo_inicio
        AND NEW.aprovado_em <= periodo_fim
    LOOP
      RAISE NOTICE 'Recalculando meta equipe %', _meta.id;
      PERFORM recalcular_valor_meta_vendas(_meta.id);
    END LOOP;
  END IF;
  
  -- ========================================================================
  -- Atualizar METAS DE VENDEDOR (individuais) ✨ NOVO ✨
  -- ========================================================================
  IF _vendedor_id IS NOT NULL THEN
    FOR _meta IN 
      SELECT id 
      FROM metas_vendedor 
      WHERE vendedor_id = _vendedor_id
        AND status = 'ativa'
        AND NEW.aprovado_em >= periodo_inicio
        AND NEW.aprovado_em <= periodo_fim
    LOOP
      RAISE NOTICE 'Recalculando meta vendedor %', _meta.id;
      PERFORM recalcular_valor_meta_vendedor(_meta.id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.atualizar_meta_vendas_trigger IS 
'Trigger que atualiza metas de equipe E metas individuais de vendedor quando uma venda é aprovada';

-- ============================================================================
-- FASE 3: Preencher equipe_id em vendas existentes
-- ============================================================================

DO $$
DECLARE
  _updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Iniciando preenchimento de equipe_id em vendas existentes...';
  
  UPDATE vendas v
  SET equipe_id = (
    SELECT me.equipe_id 
    FROM membros_equipe me
    INNER JOIN equipes e ON e.id = me.equipe_id
    WHERE me.usuario_id = v.vendedor_id
      AND me.esta_ativo = true 
      AND e.esta_ativa = true
    LIMIT 1
  )
  WHERE equipe_id IS NULL 
    AND vendedor_id IS NOT NULL;
  
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RAISE NOTICE 'Atualizadas % vendas com equipe_id', _updated_count;
END $$;

-- ============================================================================
-- FASE 4: Recalcular todas as metas existentes
-- ============================================================================

DO $$
DECLARE
  _meta RECORD;
  _count_vendedor INTEGER := 0;
  _count_equipe INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando recálculo de todas as metas ativas...';
  
  -- Recalcular metas de vendedor
  FOR _meta IN 
    SELECT id FROM metas_vendedor WHERE status = 'ativa'
  LOOP
    PERFORM recalcular_valor_meta_vendedor(_meta.id);
    _count_vendedor := _count_vendedor + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculadas % metas de vendedor', _count_vendedor;
  
  -- Recalcular metas de equipe (tipo vendas)
  FOR _meta IN 
    SELECT id FROM metas_equipe WHERE tipo_meta = 'vendas' AND status = 'ativa'
  LOOP
    PERFORM recalcular_valor_meta_vendas(_meta.id);
    _count_equipe := _count_equipe + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculadas % metas de equipe', _count_equipe;
END $$;

-- ============================================================================
-- FASE 5: Criar RPC para recálculo manual (admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalcular_todas_metas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meta RECORD;
  _count_vendedor INTEGER := 0;
  _count_equipe INTEGER := 0;
  _resultado jsonb;
BEGIN
  -- Verificar permissão (apenas admin/manager)
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admin/manager podem recalcular metas';
  END IF;
  
  -- Recalcular metas de vendedor
  FOR _meta IN 
    SELECT id FROM metas_vendedor WHERE status = 'ativa'
  LOOP
    PERFORM recalcular_valor_meta_vendedor(_meta.id);
    _count_vendedor := _count_vendedor + 1;
  END LOOP;
  
  -- Recalcular metas de equipe
  FOR _meta IN 
    SELECT id FROM metas_equipe WHERE tipo_meta = 'vendas' AND status = 'ativa'
  LOOP
    PERFORM recalcular_valor_meta_vendas(_meta.id);
    _count_equipe := _count_equipe + 1;
  END LOOP;
  
  _resultado := jsonb_build_object(
    'success', true,
    'metas_vendedor_recalculadas', _count_vendedor,
    'metas_equipe_recalculadas', _count_equipe,
    'timestamp', now()
  );
  
  RETURN _resultado;
END;
$$;

COMMENT ON FUNCTION public.recalcular_todas_metas IS 
'Recalcula manualmente todas as metas ativas (vendedor e equipe). Apenas admin/manager.';

-- ============================================================================
-- FASE 6: Adicionar validação para garantir equipe_id em vendas aprovadas
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validar_equipe_venda_aprovada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se a venda está sendo aprovada, garantir que tem equipe_id
  IF NEW.aprovado_em IS NOT NULL AND NEW.equipe_id IS NULL THEN
    RAISE WARNING 'Venda % aprovada sem equipe_id. Vendedor: %', NEW.id, NEW.vendedor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validar_equipe_venda_aprovada ON vendas;

CREATE TRIGGER trigger_validar_equipe_venda_aprovada
  BEFORE INSERT OR UPDATE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION validar_equipe_venda_aprovada();

COMMENT ON TRIGGER trigger_validar_equipe_venda_aprovada ON vendas IS 
'Valida e alerta quando uma venda aprovada não tem equipe_id associado';