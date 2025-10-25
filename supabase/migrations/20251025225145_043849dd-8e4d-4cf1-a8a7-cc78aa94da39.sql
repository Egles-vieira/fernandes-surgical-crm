-- ============================================
-- FASE 1: CAMPOS FALTANTES E PADRONIZAÇÃO (Corrigido)
-- ============================================

-- 1.1 Adicionar campos faltantes em edi_cotacoes
ALTER TABLE edi_cotacoes 
ADD COLUMN IF NOT EXISTS itens_analisados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_itens_para_analise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS analise_ia_iniciada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analise_ia_concluida_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS erro_analise_ia TEXT;

-- 1.2 Adicionar campos faltantes em edi_cotacoes_itens
ALTER TABLE edi_cotacoes_itens 
ADD COLUMN IF NOT EXISTS analisado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS produto_aceito_ia_id UUID REFERENCES produtos(id),
ADD COLUMN IF NOT EXISTS feedback_vendedor VARCHAR(50),
ADD COLUMN IF NOT EXISTS feedback_vendedor_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_analise_segundos INTEGER;

-- 1.3 Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_analisado 
ON edi_cotacoes_itens(analisado_por_ia) 
WHERE analisado_por_ia = true;

CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_score 
ON edi_cotacoes_itens(score_confianca_ia DESC NULLS LAST)
WHERE score_confianca_ia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edi_produtos_sugeridos_gin 
ON edi_cotacoes_itens USING gin(produtos_sugeridos_ia)
WHERE produtos_sugeridos_ia IS NOT NULL;

-- 1.4 Adicionar campos para Machine Learning na ia_score_ajustes
ALTER TABLE ia_score_ajustes
ADD COLUMN IF NOT EXISTS motivo_ajuste TEXT,
ADD COLUMN IF NOT EXISTS feedback_origem VARCHAR(50),
ADD COLUMN IF NOT EXISTS score_anterior NUMERIC,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 1.5 Criar função para registrar feedback da IA
CREATE OR REPLACE FUNCTION registrar_feedback_ia(
  p_item_id UUID,
  p_produto_sugerido_id UUID,
  p_produto_escolhido_id UUID,
  p_feedback_tipo VARCHAR,  -- 'aceito', 'rejeitado', 'modificado'
  p_score_ia NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Registrar no histórico
  INSERT INTO ia_feedback_historico (
    item_id,
    produto_sugerido_id,
    produto_escolhido_id,
    feedback_tipo,
    score_original,
    criado_por
  ) VALUES (
    p_item_id,
    p_produto_sugerido_id,
    p_produto_escolhido_id,
    p_feedback_tipo,
    p_score_ia,
    auth.uid()
  );

  -- Atualizar item com feedback
  UPDATE edi_cotacoes_itens 
  SET 
    feedback_vendedor = p_feedback_tipo,
    feedback_vendedor_em = NOW(),
    produto_aceito_ia_id = CASE 
      WHEN p_feedback_tipo = 'aceito' THEN p_produto_sugerido_id 
      ELSE NULL 
    END
  WHERE id = p_item_id;

  RAISE NOTICE 'Feedback registrado: item=%, tipo=%, produto=%', 
    p_item_id, p_feedback_tipo, p_produto_sugerido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.6 Criar função para ajustar score com aprendizado
CREATE OR REPLACE FUNCTION ajustar_score_aprendizado(
  p_produto_id UUID,
  p_feedback_tipo VARCHAR,
  p_score_original NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_ajuste NUMERIC;
  v_motivo TEXT;
BEGIN
  -- Calcular ajuste baseado no feedback
  CASE p_feedback_tipo
    WHEN 'aceito' THEN
      v_ajuste := 5;
      v_motivo := 'Sugestão aceita pelo vendedor';
    WHEN 'rejeitado' THEN
      v_ajuste := -10;
      v_motivo := 'Sugestão rejeitada pelo vendedor';
    WHEN 'modificado' THEN
      v_ajuste := -3;
      v_motivo := 'Sugestão aceita com modificações';
    ELSE
      v_ajuste := 0;
      v_motivo := 'Sem ajuste';
  END CASE;

  -- Salvar ajuste na tabela de ajustes
  INSERT INTO ia_score_ajustes (
    produto_id,
    motivo_ajuste,
    ajuste_score,
    feedback_origem,
    score_anterior,
    ativo
  ) VALUES (
    p_produto_id,
    v_motivo,
    v_ajuste,
    p_feedback_tipo,
    p_score_original,
    true
  );

  RAISE NOTICE 'Score ajustado: produto_id=%, ajuste=%, motivo=%', 
    p_produto_id, v_ajuste, v_motivo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.7 Dropar e recriar view de dashboard
DROP VIEW IF EXISTS vw_analise_ia_dashboard CASCADE;

CREATE VIEW vw_analise_ia_dashboard AS
SELECT 
    COUNT(DISTINCT ec.id) as total_cotacoes,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.analisado_por_ia = true) as total_analisadas,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.status_analise_ia = 'em_analise') as em_analise_agora,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.status_analise_ia = 'concluida') as analises_concluidas,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.status_analise_ia = 'erro') as analises_com_erro,
    ROUND(
      (COUNT(DISTINCT ec.id) FILTER (WHERE ec.analisado_por_ia = true)::NUMERIC / 
       NULLIF(COUNT(DISTINCT ec.id), 0) * 100), 2
    ) as taxa_automacao_percent,
    ROUND(AVG(ec.tempo_analise_segundos) FILTER (WHERE ec.tempo_analise_segundos > 0), 2) as tempo_medio_analise_seg,
    SUM(ec.total_itens) as total_itens_cotacoes,
    SUM(ec.total_itens_analisados) as total_itens_analisados,
    SUM(ec.total_sugestoes_geradas) as total_sugestoes_geradas,
    ROUND(
      (SUM(ec.total_sugestoes_geradas)::NUMERIC / 
       NULLIF(SUM(ec.total_itens_analisados), 0) * 100), 2
    ) as taxa_sugestoes_percent,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.criado_em >= NOW() - INTERVAL '7 days' AND ec.analisado_por_ia = true) as analises_ultimos_7_dias,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.criado_em >= NOW() - INTERVAL '24 hours' AND ec.analisado_por_ia = true) as analises_ultimas_24h,
    ROUND(
      (COUNT(DISTINCT ec.id) FILTER (WHERE ec.status_analise_ia = 'erro')::NUMERIC / 
       NULLIF(COUNT(DISTINCT ec.id) FILTER (WHERE ec.analisado_por_ia = true), 0) * 100), 2
    ) as taxa_erro_percent,
    (SELECT modelo_ia_utilizado FROM edi_cotacoes WHERE modelo_ia_utilizado IS NOT NULL ORDER BY criado_em DESC LIMIT 1) as modelo_mais_usado
FROM edi_cotacoes ec
WHERE ec.criado_em >= CURRENT_DATE - INTERVAL '30 days';

COMMENT ON VIEW vw_analise_ia_dashboard IS 'Dashboard de métricas da análise de IA - agregação dos últimos 30 dias';
COMMENT ON FUNCTION registrar_feedback_ia IS 'Registra feedback do vendedor sobre sugestões da IA e atualiza histórico';
COMMENT ON FUNCTION ajustar_score_aprendizado IS 'Ajusta scores de produtos baseado em feedback histórico para machine learning';
