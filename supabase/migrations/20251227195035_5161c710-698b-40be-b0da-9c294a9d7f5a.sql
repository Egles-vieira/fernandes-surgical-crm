-- View consolidada para lista de propostas
CREATE OR REPLACE VIEW vw_propostas_lista AS
SELECT 
  o.id,
  'oportunidade' as tipo_origem,
  o.codigo,
  o.nome_oportunidade as nome,
  o.cliente_nome,
  o.cliente_cnpj,
  o.valor,
  o.percentual_probabilidade,
  o.esta_fechada,
  o.foi_ganha,
  o.data_fechamento,
  o.origem_lead,
  o.criado_em,
  o.atualizado_em,
  
  -- Pipeline/Estágio
  p.id as pipeline_id,
  p.nome as pipeline_nome,
  p.cor as pipeline_cor,
  ep.id as estagio_id,
  ep.nome_estagio,
  ep.cor as estagio_cor,
  ep.ordem_estagio,
  
  -- Vendedor/Proprietário
  pv.id as vendedor_id,
  pv.nome_completo as vendedor_nome,
  pv.foto_perfil_url as vendedor_avatar,
  pv.codigo_vendedor,
  
  -- Token Público
  pt.id as token_id,
  pt.public_token,
  pt.ativo as token_ativo,
  pt.expira_em as token_expira_em,
  pt.criado_em as link_criado_em,
  
  -- Analytics Agregados (usando subquery para evitar problemas com LATERAL)
  COALESCE((
    SELECT COUNT(*) 
    FROM propostas_analytics pa 
    WHERE pa.oportunidade_id = o.id
  ), 0) as total_visualizacoes,
  COALESCE((
    SELECT COUNT(DISTINCT session_id) 
    FROM propostas_analytics pa 
    WHERE pa.oportunidade_id = o.id
  ), 0) as visualizacoes_unicas,
  (
    SELECT MAX(iniciado_em) 
    FROM propostas_analytics pa 
    WHERE pa.oportunidade_id = o.id
  ) as ultima_visualizacao_em,
  COALESCE((
    SELECT SUM(tempo_total_segundos) 
    FROM propostas_analytics pa 
    WHERE pa.oportunidade_id = o.id
  ), 0) as tempo_total_segundos,
  
  -- Última Resposta
  (
    SELECT pr.tipo_resposta 
    FROM propostas_respostas pr 
    WHERE pr.oportunidade_id = o.id 
    ORDER BY pr.respondido_em DESC 
    LIMIT 1
  ) as ultima_resposta,
  (
    SELECT pr.respondido_em 
    FROM propostas_respostas pr 
    WHERE pr.oportunidade_id = o.id 
    ORDER BY pr.respondido_em DESC 
    LIMIT 1
  ) as resposta_em,
  (
    SELECT pr.nome_respondente 
    FROM propostas_respostas pr 
    WHERE pr.oportunidade_id = o.id 
    ORDER BY pr.respondido_em DESC 
    LIMIT 1
  ) as nome_respondente,
  
  -- Status Calculado
  CASE 
    WHEN o.foi_ganha = true THEN 'ganha'
    WHEN o.esta_fechada = true AND o.foi_ganha = false THEN 'perdida'
    WHEN EXISTS (
      SELECT 1 FROM propostas_respostas pr 
      WHERE pr.oportunidade_id = o.id AND pr.tipo_resposta = 'aceita'
    ) THEN 'aceita'
    WHEN EXISTS (
      SELECT 1 FROM propostas_respostas pr 
      WHERE pr.oportunidade_id = o.id AND pr.tipo_resposta = 'recusada'
    ) THEN 'recusada'
    WHEN pt.ativo = true AND EXISTS (
      SELECT 1 FROM propostas_analytics pa WHERE pa.oportunidade_id = o.id
    ) THEN 'visualizada'
    WHEN pt.ativo = true THEN 'enviada'
    WHEN pt.id IS NULL THEN 'sem_link'
    ELSE 'expirada'
  END as status_proposta

FROM oportunidades o
LEFT JOIN pipelines p ON o.pipeline_id = p.id
LEFT JOIN estagios_pipeline ep ON o.estagio_id = ep.id
LEFT JOIN perfis_usuario pv ON o.vendedor_id = pv.id
LEFT JOIN LATERAL (
  SELECT * FROM propostas_publicas_tokens 
  WHERE oportunidade_id = o.id 
  ORDER BY criado_em DESC 
  LIMIT 1
) pt ON true
WHERE o.excluido_em IS NULL;

-- Índices para performance dos filtros
CREATE INDEX IF NOT EXISTS idx_oportunidades_pipeline_id ON oportunidades(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor_id ON oportunidades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_criado_em ON oportunidades(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_propostas_analytics_oportunidade_id ON propostas_analytics(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_propostas_respostas_oportunidade_id ON propostas_respostas(oportunidade_id);