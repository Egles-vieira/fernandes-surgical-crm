-- Drop existing indexes if they exist
DROP INDEX IF EXISTS public.idx_metas_vendedor_vendedor;
DROP INDEX IF EXISTS public.idx_metas_vendedor_equipe;
DROP INDEX IF EXISTS public.idx_metas_vendedor_status;
DROP INDEX IF EXISTS public.idx_metas_vendedor_periodo;
DROP INDEX IF EXISTS public.idx_progresso_vendedor_meta;
DROP INDEX IF EXISTS public.idx_progresso_vendedor_data;

-- Tabela de metas individuais por vendedor
CREATE TABLE IF NOT EXISTS public.metas_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL,
  equipe_id UUID REFERENCES public.equipes(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_meta TEXT NOT NULL CHECK (tipo_meta IN ('vendas', 'atendimentos', 'conversao', 'satisfacao_cliente')),
  metrica TEXT NOT NULL,
  unidade_medida TEXT,
  valor_objetivo NUMERIC NOT NULL,
  valor_atual NUMERIC DEFAULT 0,
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  alerta_percentual INTEGER DEFAULT 80,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada', 'pausada')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT
);

-- Índices para performance
CREATE INDEX idx_metas_vendedor_vendedor ON public.metas_vendedor(vendedor_id);
CREATE INDEX idx_metas_vendedor_equipe ON public.metas_vendedor(equipe_id);
CREATE INDEX idx_metas_vendedor_status ON public.metas_vendedor(status);
CREATE INDEX idx_metas_vendedor_periodo ON public.metas_vendedor(periodo_inicio, periodo_fim);

-- RLS Policies
ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendedor vê suas metas" ON public.metas_vendedor;
CREATE POLICY "Vendedor vê suas metas"
  ON public.metas_vendedor FOR SELECT
  USING (
    vendedor_id = auth.uid() OR
    has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
  );

DROP POLICY IF EXISTS "Líderes criam metas para sua equipe" ON public.metas_vendedor;
CREATE POLICY "Líderes criam metas para sua equipe"
  ON public.metas_vendedor FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipes e
      WHERE e.id = metas_vendedor.equipe_id
      AND (e.lider_equipe_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]))
    )
  );

DROP POLICY IF EXISTS "Líderes atualizam metas de sua equipe" ON public.metas_vendedor;
CREATE POLICY "Líderes atualizam metas de sua equipe"
  ON public.metas_vendedor FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM equipes e
      WHERE e.id = metas_vendedor.equipe_id
      AND (e.lider_equipe_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]))
    )
  );

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_metas_vendedor_updated_at ON public.metas_vendedor;
CREATE TRIGGER update_metas_vendedor_updated_at
  BEFORE UPDATE ON public.metas_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de progresso de metas individuais
CREATE TABLE IF NOT EXISTS public.progresso_metas_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID NOT NULL REFERENCES public.metas_vendedor(id) ON DELETE CASCADE,
  valor_anterior NUMERIC NOT NULL,
  valor_novo NUMERIC NOT NULL,
  diferenca NUMERIC GENERATED ALWAYS AS (valor_novo - valor_anterior) STORED,
  percentual_conclusao NUMERIC,
  referencia_id UUID,
  origem TEXT,
  observacao TEXT,
  registrado_por UUID,
  registrado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_progresso_vendedor_meta ON public.progresso_metas_vendedor(meta_id);
CREATE INDEX idx_progresso_vendedor_data ON public.progresso_metas_vendedor(registrado_em);

ALTER TABLE public.progresso_metas_vendedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendedor vê progresso de suas metas" ON public.progresso_metas_vendedor;
CREATE POLICY "Vendedor vê progresso de suas metas"
  ON public.progresso_metas_vendedor FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM metas_vendedor mv
      WHERE mv.id = progresso_metas_vendedor.meta_id
      AND (mv.vendedor_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]))
    )
  );

DROP POLICY IF EXISTS "Sistema registra progresso" ON public.progresso_metas_vendedor;
CREATE POLICY "Sistema registra progresso"
  ON public.progresso_metas_vendedor FOR INSERT
  WITH CHECK (true);