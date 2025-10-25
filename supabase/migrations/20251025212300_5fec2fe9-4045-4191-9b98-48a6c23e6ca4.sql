-- =====================================================
-- ETAPA 1: BANCO DE DADOS - ANÁLISE IA DE COTAÇÕES
-- =====================================================

-- 1. Criar ENUM para status de análise IA
CREATE TYPE status_analise_ia AS ENUM (
  'pendente',
  'em_analise', 
  'concluida',
  'erro',
  'cancelada'
);

-- 2. Criar ENUM para método de vinculação
CREATE TYPE metodo_vinculacao AS ENUM (
  'ia_automatico',
  'ia_manual',
  'manual',
  'importado'
);

-- 3. Adicionar campos de análise IA à tabela edi_cotacoes
ALTER TABLE public.edi_cotacoes
  ADD COLUMN IF NOT EXISTS status_analise_ia status_analise_ia DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS analisado_por_ia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS analise_iniciada_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS analise_concluida_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS progresso_analise_percent integer DEFAULT 0 CHECK (progresso_analise_percent >= 0 AND progresso_analise_percent <= 100),
  ADD COLUMN IF NOT EXISTS total_itens_analisados integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sugestoes_geradas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_analise_segundos integer,
  ADD COLUMN IF NOT EXISTS erro_analise text,
  ADD COLUMN IF NOT EXISTS modelo_ia_utilizado varchar(100),
  ADD COLUMN IF NOT EXISTS versao_algoritmo varchar(50);

-- 4. Adicionar campos de análise IA à tabela edi_cotacoes_itens
ALTER TABLE public.edi_cotacoes_itens
  ADD COLUMN IF NOT EXISTS analisado_por_ia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS analise_ia_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS score_confianca_ia numeric(5,2) CHECK (score_confianca_ia >= 0 AND score_confianca_ia <= 100),
  ADD COLUMN IF NOT EXISTS produtos_sugeridos_ia jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS produto_selecionado_id uuid REFERENCES public.produtos(id),
  ADD COLUMN IF NOT EXISTS metodo_vinculacao metodo_vinculacao,
  ADD COLUMN IF NOT EXISTS justificativa_ia text,
  ADD COLUMN IF NOT EXISTS tempo_analise_ms integer,
  ADD COLUMN IF NOT EXISTS requer_revisao_humana boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisado_por uuid,
  ADD COLUMN IF NOT EXISTS revisado_em timestamp with time zone;

-- 5. Criar tabela de feedback de IA
CREATE TABLE IF NOT EXISTS public.ia_feedback_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_item_id uuid NOT NULL REFERENCES public.edi_cotacoes_itens(id) ON DELETE CASCADE,
  produto_sugerido_id uuid REFERENCES public.produtos(id),
  produto_correto_id uuid REFERENCES public.produtos(id),
  score_original numeric(5,2),
  foi_aceito boolean NOT NULL,
  tipo_feedback varchar(50) NOT NULL, -- 'aceito', 'rejeitado', 'alternativa_escolhida', 'manual'
  usuario_id uuid,
  motivo_rejeicao text,
  detalhes_contexto jsonb,
  criado_em timestamp with time zone DEFAULT now(),
  
  -- Índices
  CONSTRAINT ia_feedback_historico_tipo_check CHECK (tipo_feedback IN ('aceito', 'rejeitado', 'alternativa_escolhida', 'manual'))
);

-- 6. Criar tabela de ajustes de score da IA
CREATE TABLE IF NOT EXISTS public.ia_score_ajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid REFERENCES public.plataformas_edi(id),
  cnpj_cliente varchar(18),
  padrao_descricao text,
  padrao_codigo varchar(100),
  produto_id uuid REFERENCES public.produtos(id),
  ajuste_score numeric(5,2) NOT NULL, -- Pode ser positivo ou negativo
  total_ocorrencias integer DEFAULT 1,
  taxa_acerto numeric(5,2),
  ultima_utilizacao_em timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  criado_por uuid,
  observacoes text,
  
  -- Constraint para garantir que pelo menos um padrão seja definido
  CONSTRAINT ia_score_ajustes_padrao_check CHECK (
    padrao_descricao IS NOT NULL OR 
    padrao_codigo IS NOT NULL OR 
    (plataforma_id IS NOT NULL AND cnpj_cliente IS NOT NULL)
  )
);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_status_analise_ia 
  ON public.edi_cotacoes(status_analise_ia) 
  WHERE status_analise_ia IN ('pendente', 'em_analise');

CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_analisado_por_ia 
  ON public.edi_cotacoes(analisado_por_ia, analise_concluida_em);

CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_analisado_ia 
  ON public.edi_cotacoes_itens(analisado_por_ia, score_confianca_ia);

CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_requer_revisao 
  ON public.edi_cotacoes_itens(requer_revisao_humana) 
  WHERE requer_revisao_humana = true;

CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_produto_selecionado 
  ON public.edi_cotacoes_itens(produto_selecionado_id);

CREATE INDEX IF NOT EXISTS idx_ia_feedback_cotacao_item 
  ON public.ia_feedback_historico(cotacao_item_id, foi_aceito);

CREATE INDEX IF NOT EXISTS idx_ia_feedback_produto_sugerido 
  ON public.ia_feedback_historico(produto_sugerido_id);

CREATE INDEX IF NOT EXISTS idx_ia_score_ajustes_plataforma_cliente 
  ON public.ia_score_ajustes(plataforma_id, cnpj_cliente);

CREATE INDEX IF NOT EXISTS idx_ia_score_ajustes_produto 
  ON public.ia_score_ajustes(produto_id);

-- 8. Criar índice GIN para busca em JSONB de sugestões
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_sugestoes_gin 
  ON public.edi_cotacoes_itens USING gin(produtos_sugeridos_ia);

-- 9. Criar trigger para atualizar timestamp em ia_score_ajustes
CREATE OR REPLACE FUNCTION atualizar_score_ajuste_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_score_ajuste_timestamp
  BEFORE UPDATE ON public.ia_score_ajustes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_score_ajuste_timestamp();

-- 10. Adicionar RLS policies para as novas tabelas
ALTER TABLE public.ia_feedback_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_score_ajustes ENABLE ROW LEVEL SECURITY;

-- Policies para ia_feedback_historico
CREATE POLICY "Usuários podem visualizar feedback"
  ON public.ia_feedback_historico
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Sistema pode inserir feedback"
  ON public.ia_feedback_historico
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies para ia_score_ajustes
CREATE POLICY "Usuários podem visualizar ajustes de score"
  ON public.ia_score_ajustes
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins e Managers podem gerenciar ajustes de score"
  ON public.ia_score_ajustes
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- 11. Comentários nas tabelas para documentação
COMMENT ON TABLE public.ia_feedback_historico IS 'Registra feedback sobre sugestões de produtos feitas pela IA para aprendizado contínuo';
COMMENT ON TABLE public.ia_score_ajustes IS 'Armazena ajustes de score baseados em padrões identificados para melhorar precisão da IA';

COMMENT ON COLUMN public.edi_cotacoes.status_analise_ia IS 'Status atual da análise IA: pendente, em_analise, concluida, erro, cancelada';
COMMENT ON COLUMN public.edi_cotacoes.progresso_analise_percent IS 'Percentual de progresso da análise (0-100)';
COMMENT ON COLUMN public.edi_cotacoes_itens.produtos_sugeridos_ia IS 'Array JSONB com sugestões de produtos: [{produto_id, score, razoes[], alternativas[]}]';
COMMENT ON COLUMN public.edi_cotacoes_itens.metodo_vinculacao IS 'Como o produto foi vinculado: ia_automatico, ia_manual, manual, importado';
COMMENT ON COLUMN public.edi_cotacoes_itens.requer_revisao_humana IS 'Flag indicando se a sugestão IA precisa de revisão humana (score baixo ou ambiguidade)';