-- ============================================
-- FASE 1: Migração do Banco de Dados (CORRIGIDO)
-- Adicionar suporte a oportunidades nas tabelas de propostas
-- ============================================

-- 1.1. Alterar tabela propostas_publicas_tokens
ALTER TABLE public.propostas_publicas_tokens 
  ADD COLUMN IF NOT EXISTS oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE CASCADE;

ALTER TABLE public.propostas_publicas_tokens 
  ALTER COLUMN venda_id DROP NOT NULL;

ALTER TABLE public.propostas_publicas_tokens 
  ADD CONSTRAINT chk_token_venda_ou_oportunidade 
  CHECK (
    (venda_id IS NOT NULL AND oportunidade_id IS NULL) OR 
    (venda_id IS NULL AND oportunidade_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_propostas_tokens_oportunidade_id 
  ON public.propostas_publicas_tokens(oportunidade_id);

-- 1.2. Alterar tabela propostas_analytics
ALTER TABLE public.propostas_analytics 
  ADD COLUMN IF NOT EXISTS oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE CASCADE;

ALTER TABLE public.propostas_analytics 
  ALTER COLUMN venda_id DROP NOT NULL;

ALTER TABLE public.propostas_analytics 
  ADD CONSTRAINT chk_analytics_venda_ou_oportunidade 
  CHECK (
    (venda_id IS NOT NULL AND oportunidade_id IS NULL) OR 
    (venda_id IS NULL AND oportunidade_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_propostas_analytics_oportunidade 
  ON public.propostas_analytics(oportunidade_id);

-- 1.3. Alterar tabela propostas_respostas
ALTER TABLE public.propostas_respostas 
  ADD COLUMN IF NOT EXISTS oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE CASCADE;

ALTER TABLE public.propostas_respostas 
  ALTER COLUMN venda_id DROP NOT NULL;

ALTER TABLE public.propostas_respostas 
  ADD CONSTRAINT chk_respostas_venda_ou_oportunidade 
  CHECK (
    (venda_id IS NOT NULL AND oportunidade_id IS NULL) OR 
    (venda_id IS NULL AND oportunidade_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_propostas_respostas_oportunidade 
  ON public.propostas_respostas(oportunidade_id);

-- 1.4. RLS policies para oportunidades (usando proprietario_id)
DROP POLICY IF EXISTS "propostas_tokens_select_oportunidade" ON public.propostas_publicas_tokens;
CREATE POLICY "propostas_tokens_select_oportunidade" ON public.propostas_publicas_tokens
  FOR SELECT USING (
    oportunidade_id IN (
      SELECT id FROM public.oportunidades WHERE proprietario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "propostas_analytics_select_oportunidade" ON public.propostas_analytics;
CREATE POLICY "propostas_analytics_select_oportunidade" ON public.propostas_analytics
  FOR SELECT USING (
    oportunidade_id IN (
      SELECT id FROM public.oportunidades WHERE proprietario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "propostas_respostas_select_oportunidade" ON public.propostas_respostas;
CREATE POLICY "propostas_respostas_select_oportunidade" ON public.propostas_respostas
  FOR SELECT USING (
    oportunidade_id IN (
      SELECT id FROM public.oportunidades WHERE proprietario_id = auth.uid()
    )
  );