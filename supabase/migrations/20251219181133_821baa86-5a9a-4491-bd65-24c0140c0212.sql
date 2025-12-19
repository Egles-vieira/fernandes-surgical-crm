-- =============================================
-- CORREÇÕES DE PERFORMANCE - PARTE 1 (SEM ÍNDICE CONCURRENTLY)
-- =============================================

-- 1. CRIAR ÍNDICE NORMAL (não CONCURRENTLY para funcionar em transação)
CREATE INDEX IF NOT EXISTS idx_itens_linha_oportunidade_oportunidade_id 
ON public.itens_linha_oportunidade(oportunidade_id);

-- 2. REMOVER TRIGGER DUPLICADO
DROP TRIGGER IF EXISTS trigger_update_item_oportunidade_timestamp 
ON public.itens_linha_oportunidade;

-- 3. REMOVER TRIGGER ANTIGO SEM FILTRO
DROP TRIGGER IF EXISTS trigger_itens_linha_oportunidade_updated_at 
ON public.itens_linha_oportunidade;

-- 4. CRIAR TRIGGER OTIMIZADO COM FILTRO DE COLUNAS
CREATE OR REPLACE FUNCTION public.atualizar_updated_at_itens()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_itens_linha_oportunidade_updated_at
BEFORE UPDATE OF quantidade, preco_unitario, percentual_desconto, valor_desconto, ordem_linha
ON public.itens_linha_oportunidade
FOR EACH ROW
WHEN (OLD.quantidade IS DISTINCT FROM NEW.quantidade 
   OR OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario
   OR OLD.percentual_desconto IS DISTINCT FROM NEW.percentual_desconto
   OR OLD.valor_desconto IS DISTINCT FROM NEW.valor_desconto
   OR OLD.ordem_linha IS DISTINCT FROM NEW.ordem_linha)
EXECUTE FUNCTION public.atualizar_updated_at_itens();

-- 5. CRIAR TABELA DE JOBS PARA RECÁLCULO ASSÍNCRONO
CREATE TABLE IF NOT EXISTS public.jobs_recalculo_oportunidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id UUID NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tentativas INTEGER DEFAULT 0,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  processado_em TIMESTAMPTZ
);

-- Índice único parcial para evitar duplicatas de jobs pendentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_recalculo_unique_pending 
ON public.jobs_recalculo_oportunidade(oportunidade_id) 
WHERE status = 'pending';

-- Índices para processamento eficiente
CREATE INDEX IF NOT EXISTS idx_jobs_recalculo_status ON public.jobs_recalculo_oportunidade(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_recalculo_oportunidade_id ON public.jobs_recalculo_oportunidade(oportunidade_id);

-- RLS para jobs
ALTER TABLE public.jobs_recalculo_oportunidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs visíveis para usuários autenticados"
ON public.jobs_recalculo_oportunidade FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Jobs podem ser inseridos por usuários autenticados"
ON public.jobs_recalculo_oportunidade FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. FUNÇÃO PARA PROCESSAR JOBS DE RECÁLCULO (CHAMADA VIA CRON/EDGE FUNCTION)
CREATE OR REPLACE FUNCTION public.processar_jobs_recalculo_oportunidade(p_limite INTEGER DEFAULT 50)
RETURNS TABLE(
  jobs_processados INTEGER,
  jobs_com_erro INTEGER
) AS $$
DECLARE
  v_job RECORD;
  v_processados INTEGER := 0;
  v_erros INTEGER := 0;
  v_novo_valor NUMERIC;
BEGIN
  -- Processar jobs pendentes com lock para evitar concorrência
  FOR v_job IN 
    SELECT j.id, j.oportunidade_id
    FROM public.jobs_recalculo_oportunidade j
    WHERE j.status = 'pending'
    ORDER BY j.criado_em ASC
    LIMIT p_limite
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Marcar como processando
      UPDATE public.jobs_recalculo_oportunidade 
      SET status = 'processing', tentativas = tentativas + 1
      WHERE id = v_job.id;
      
      -- Calcular novo valor
      SELECT COALESCE(SUM(
        (quantidade * preco_unitario) - COALESCE(valor_desconto, 0)
      ), 0)
      INTO v_novo_valor
      FROM public.itens_linha_oportunidade
      WHERE oportunidade_id = v_job.oportunidade_id;
      
      -- Atualizar oportunidade
      UPDATE public.oportunidades 
      SET valor = v_novo_valor
      WHERE id = v_job.oportunidade_id;
      
      -- Marcar como concluído
      UPDATE public.jobs_recalculo_oportunidade 
      SET status = 'completed', processado_em = NOW()
      WHERE id = v_job.id;
      
      v_processados := v_processados + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Registrar erro
      UPDATE public.jobs_recalculo_oportunidade 
      SET status = 'failed', erro = SQLERRM, processado_em = NOW()
      WHERE id = v_job.id;
      
      v_erros := v_erros + 1;
    END;
  END LOOP;
  
  -- Limpar jobs antigos completados (mais de 1 hora)
  DELETE FROM public.jobs_recalculo_oportunidade 
  WHERE status = 'completed' AND processado_em < NOW() - INTERVAL '1 hour';
  
  RETURN QUERY SELECT v_processados, v_erros;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. MODIFICAR RPC DE BATCH PARA USAR JOBS AO INVÉS DE UPDATE SÍNCRONO
CREATE OR REPLACE FUNCTION public.atualizar_itens_oportunidade_batch(
  p_oportunidade_id UUID,
  p_itens JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_item JSONB;
  v_item_id UUID;
  v_quantidade NUMERIC;
  v_percentual_desconto NUMERIC;
  v_preco_unitario NUMERIC;
  v_updated_at TIMESTAMPTZ;
  v_current_updated_at TIMESTAMPTZ;
  v_updated_count INTEGER := 0;
  v_conflict_count INTEGER := 0;
BEGIN
  -- Validação
  IF p_oportunidade_id IS NULL THEN
    RAISE EXCEPTION 'oportunidade_id é obrigatório';
  END IF;
  
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RETURN jsonb_build_object('success', true, 'updated', 0, 'conflicts', 0);
  END IF;
  
  -- Processar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_item_id := (v_item->>'id')::UUID;
    v_quantidade := (v_item->>'quantidade')::NUMERIC;
    v_percentual_desconto := (v_item->>'percentual_desconto')::NUMERIC;
    v_preco_unitario := (v_item->>'preco_unitario')::NUMERIC;
    v_updated_at := (v_item->>'updated_at')::TIMESTAMPTZ;
    
    -- Verificar lock otimista
    SELECT atualizado_em INTO v_current_updated_at
    FROM public.itens_linha_oportunidade
    WHERE id = v_item_id AND oportunidade_id = p_oportunidade_id;
    
    -- Se timestamps não batem, há conflito
    IF v_updated_at IS NOT NULL AND v_current_updated_at IS NOT NULL 
       AND v_current_updated_at > v_updated_at THEN
      v_conflict_count := v_conflict_count + 1;
      CONTINUE;
    END IF;
    
    -- Atualizar item
    UPDATE public.itens_linha_oportunidade
    SET 
      quantidade = COALESCE(v_quantidade, quantidade),
      percentual_desconto = COALESCE(v_percentual_desconto, percentual_desconto),
      preco_unitario = COALESCE(v_preco_unitario, preco_unitario),
      valor_desconto = CASE 
        WHEN v_percentual_desconto IS NOT NULL THEN
          (COALESCE(v_quantidade, quantidade) * COALESCE(v_preco_unitario, preco_unitario)) * (v_percentual_desconto / 100)
        ELSE valor_desconto
      END
    WHERE id = v_item_id AND oportunidade_id = p_oportunidade_id;
    
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;
  
  -- INSERIR JOB ASSÍNCRONO AO INVÉS DE UPDATE SÍNCRONO
  INSERT INTO public.jobs_recalculo_oportunidade (oportunidade_id, status)
  VALUES (p_oportunidade_id, 'pending')
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count,
    'conflicts', v_conflict_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;