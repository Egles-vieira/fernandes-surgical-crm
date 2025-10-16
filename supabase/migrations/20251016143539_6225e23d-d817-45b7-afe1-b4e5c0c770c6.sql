-- Adicionar novos status ao enum de vendas (expandir para pipeline completo)
-- Criar tipo enum para etapas do pipeline
CREATE TYPE public.etapa_pipeline AS ENUM (
  'prospeccao',
  'qualificacao',
  'proposta',
  'negociacao',
  'fechamento',
  'ganho',
  'perdido'
);

-- Adicionar coluna de etapa_pipeline à tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN IF NOT EXISTS etapa_pipeline etapa_pipeline DEFAULT 'prospeccao';

-- Atualizar vendas existentes para mapear status antigos para etapas
UPDATE public.vendas 
SET etapa_pipeline = CASE 
  WHEN status = 'rascunho' THEN 'prospeccao'::etapa_pipeline
  WHEN status = 'aprovada' THEN 'ganho'::etapa_pipeline
  WHEN status = 'cancelada' THEN 'perdido'::etapa_pipeline
  ELSE 'proposta'::etapa_pipeline
END
WHERE etapa_pipeline IS NULL;

-- Adicionar colunas auxiliares para o pipeline
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS valor_estimado numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS probabilidade integer DEFAULT 50 CHECK (probabilidade >= 0 AND probabilidade <= 100),
ADD COLUMN IF NOT EXISTS data_fechamento_prevista date,
ADD COLUMN IF NOT EXISTS motivo_perda text,
ADD COLUMN IF NOT EXISTS origem_lead text,
ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES auth.users(id);

-- Criar índice para melhorar performance de queries por etapa
CREATE INDEX IF NOT EXISTS idx_vendas_etapa_pipeline ON public.vendas(etapa_pipeline);
CREATE INDEX IF NOT EXISTS idx_vendas_responsavel ON public.vendas(responsavel_id);

-- Comentários para documentação
COMMENT ON COLUMN public.vendas.etapa_pipeline IS 'Etapa atual da venda no pipeline (funil de vendas)';
COMMENT ON COLUMN public.vendas.probabilidade IS 'Probabilidade de fechamento (0-100%)';
COMMENT ON COLUMN public.vendas.valor_estimado IS 'Valor estimado da venda (pode diferir do valor_total)';
COMMENT ON COLUMN public.vendas.data_fechamento_prevista IS 'Data prevista para fechamento da venda';
COMMENT ON COLUMN public.vendas.motivo_perda IS 'Razão pela qual a venda foi perdida';
COMMENT ON COLUMN public.vendas.origem_lead IS 'Origem do lead (ex: indicação, site, cold call)';
COMMENT ON COLUMN public.vendas.responsavel_id IS 'Vendedor responsável pela oportunidade';