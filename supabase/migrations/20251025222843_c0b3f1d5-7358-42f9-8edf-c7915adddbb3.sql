-- View para Dashboard de Análise IA
CREATE OR REPLACE VIEW vw_analise_ia_dashboard AS
SELECT
  -- Métricas Gerais
  COUNT(*) as total_cotacoes,
  COUNT(*) FILTER (WHERE analisado_por_ia = true) as total_analisadas,
  COUNT(*) FILTER (WHERE status_analise_ia = 'em_analise') as em_analise_agora,
  COUNT(*) FILTER (WHERE status_analise_ia = 'concluida') as analises_concluidas,
  COUNT(*) FILTER (WHERE status_analise_ia = 'erro') as analises_com_erro,
  
  -- Taxa de Automação
  ROUND(
    (COUNT(*) FILTER (WHERE analisado_por_ia = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100), 2
  ) as taxa_automacao_percent,
  
  -- Tempo Médio de Análise
  ROUND(AVG(tempo_analise_segundos) FILTER (WHERE tempo_analise_segundos IS NOT NULL), 2) as tempo_medio_analise_seg,
  
  -- Total de Itens
  SUM(total_itens) as total_itens_cotacoes,
  SUM(total_itens_analisados) FILTER (WHERE total_itens_analisados IS NOT NULL) as total_itens_analisados,
  SUM(total_sugestoes_geradas) FILTER (WHERE total_sugestoes_geradas IS NOT NULL) as total_sugestoes_geradas,
  
  -- Taxa de Sugestões
  ROUND(
    (SUM(total_sugestoes_geradas) FILTER (WHERE total_sugestoes_geradas IS NOT NULL)::numeric / 
    NULLIF(SUM(total_itens_analisados) FILTER (WHERE total_itens_analisados IS NOT NULL), 0) * 100), 2
  ) as taxa_sugestoes_percent,
  
  -- Métricas por Período (últimos 7 dias)
  COUNT(*) FILTER (WHERE analise_iniciada_em >= NOW() - INTERVAL '7 days') as analises_ultimos_7_dias,
  
  -- Métricas por Período (últimas 24h)
  COUNT(*) FILTER (WHERE analise_iniciada_em >= NOW() - INTERVAL '24 hours') as analises_ultimas_24h,
  
  -- Taxa de Erro
  ROUND(
    (COUNT(*) FILTER (WHERE status_analise_ia = 'erro')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE analisado_por_ia = true), 0) * 100), 2
  ) as taxa_erro_percent,
  
  -- Modelo IA mais utilizado
  MODE() WITHIN GROUP (ORDER BY modelo_ia_utilizado) as modelo_mais_usado
  
FROM public.edi_cotacoes
WHERE criado_em >= NOW() - INTERVAL '30 days'; -- Últimos 30 dias

-- View para análise por dia (últimos 30 dias)
CREATE OR REPLACE VIEW vw_analise_ia_por_dia AS
SELECT
  DATE(analise_iniciada_em) as data,
  COUNT(*) as total_analises,
  COUNT(*) FILTER (WHERE status_analise_ia = 'concluida') as analises_concluidas,
  COUNT(*) FILTER (WHERE status_analise_ia = 'erro') as analises_com_erro,
  ROUND(AVG(tempo_analise_segundos), 2) as tempo_medio_seg,
  SUM(total_sugestoes_geradas) as total_sugestoes
FROM public.edi_cotacoes
WHERE analise_iniciada_em >= NOW() - INTERVAL '30 days'
  AND analise_iniciada_em IS NOT NULL
GROUP BY DATE(analise_iniciada_em)
ORDER BY data DESC;

-- View para top produtos mais sugeridos
CREATE OR REPLACE VIEW vw_produtos_mais_sugeridos_ia AS
SELECT
  p.id,
  p.referencia_interna,
  p.nome,
  COUNT(*) as vezes_sugerido,
  AVG((sugestao->>'score')::numeric) as score_medio,
  COUNT(*) FILTER (WHERE i.produto_id IS NOT NULL) as vezes_aceito,
  ROUND(
    (COUNT(*) FILTER (WHERE i.produto_id IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0) * 100), 2
  ) as taxa_aceitacao_percent
FROM public.edi_cotacoes_itens i
CROSS JOIN LATERAL jsonb_array_elements(i.produtos_sugeridos_ia) AS sugestao
LEFT JOIN public.produtos p ON p.id = (sugestao->>'produto_id')::uuid
WHERE i.produtos_sugeridos_ia IS NOT NULL
  AND jsonb_array_length(i.produtos_sugeridos_ia) > 0
GROUP BY p.id, p.referencia_interna, p.nome
ORDER BY vezes_sugerido DESC
LIMIT 50;

-- Comentários
COMMENT ON VIEW vw_analise_ia_dashboard IS 'Métricas agregadas do desempenho da IA nos últimos 30 dias';
COMMENT ON VIEW vw_analise_ia_por_dia IS 'Análise diária do desempenho da IA nos últimos 30 dias';
COMMENT ON VIEW vw_produtos_mais_sugeridos_ia IS 'Top 50 produtos mais sugeridos pela IA com taxa de aceitação';