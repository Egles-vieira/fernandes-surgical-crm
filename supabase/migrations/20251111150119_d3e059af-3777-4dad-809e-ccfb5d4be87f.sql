-- Etapa 1: Corrigir a view vw_performance_vendedor para usar roles existentes
DROP VIEW IF EXISTS vw_performance_vendedor;

CREATE VIEW vw_performance_vendedor AS
WITH vendas_periodo AS (
  SELECT 
    v.vendedor_id,
    COUNT(*) FILTER (WHERE v.status = 'aprovado') AS total_vendas,
    COUNT(*) FILTER (WHERE v.etapa_pipeline = 'ganho') AS vendas_ganhas,
    COUNT(*) FILTER (WHERE v.etapa_pipeline = 'perdido') AS vendas_perdidas,
    SUM(v.valor_final) FILTER (WHERE v.status = 'aprovado') AS valor_vendido,
    AVG(v.valor_final) FILTER (WHERE v.status = 'aprovado') AS ticket_medio,
    COUNT(DISTINCT DATE(v.data_venda)) AS dias_com_venda
  FROM vendas v
  WHERE v.data_venda >= date_trunc('month', CURRENT_DATE)
  GROUP BY v.vendedor_id
),
oportunidades_periodo AS (
  SELECT 
    o.vendedor_id,
    COUNT(*) AS total_oportunidades,
    COUNT(*) FILTER (WHERE o.foi_ganha) AS oportunidades_ganhas,
    AVG(o.percentual_probabilidade) AS probabilidade_media
  FROM oportunidades o
  WHERE o.criado_em >= date_trunc('month', CURRENT_DATE)
  GROUP BY o.vendedor_id
)
SELECT 
  p.id AS vendedor_id,
  p.primeiro_nome || ' ' || COALESCE(p.sobrenome, '') AS nome_vendedor,
  COALESCE(mv.meta_valor, 0) AS meta_valor,
  COALESCE(mv.valor_atual, 0) AS realizado_valor,
  CASE 
    WHEN COALESCE(mv.meta_valor, 0) > 0 THEN (COALESCE(mv.valor_atual, 0) / mv.meta_valor * 100)
    ELSE 0
  END AS percentual_atingimento,
  COALESCE(vp.total_vendas, 0) AS total_vendas,
  COALESCE(vp.vendas_ganhas, 0) AS vendas_ganhas,
  COALESCE(vp.vendas_perdidas, 0) AS vendas_perdidas,
  COALESCE(vp.valor_vendido, 0) AS valor_vendido,
  COALESCE(vp.ticket_medio, 0) AS ticket_medio,
  CASE 
    WHEN COALESCE(op.total_oportunidades, 0) > 0 THEN (COALESCE(op.oportunidades_ganhas, 0)::numeric / op.total_oportunidades * 100)
    ELSE 0
  END AS taxa_conversao,
  COALESCE(mv.margem_atual, 0) AS margem_media,
  COALESCE(op.probabilidade_media, 0) AS probabilidade_media,
  me.equipe_id,
  e.nome AS equipe_nome
FROM perfis_usuario p
LEFT JOIN metas_vendedor mv ON mv.vendedor_id = p.id 
  AND mv.status = 'ativa' 
  AND mv.periodo_inicio <= CURRENT_DATE 
  AND mv.periodo_fim >= CURRENT_DATE
LEFT JOIN vendas_periodo vp ON vp.vendedor_id = p.id
LEFT JOIN oportunidades_periodo op ON op.vendedor_id = p.id
LEFT JOIN membros_equipe me ON me.usuario_id = p.id AND me.esta_ativo = true
LEFT JOIN equipes e ON e.id = me.equipe_id
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id 
  AND ur.role IN ('sales', 'manager', 'admin')
);

-- Etapa 4: Criar meta de exemplo para o vendedor Ulisses silva (se existir)
DO $$
DECLARE
  v_vendedor_id UUID;
  v_equipe_id UUID;
BEGIN
  -- Buscar ID do vendedor Ulisses silva
  SELECT id INTO v_vendedor_id 
  FROM perfis_usuario 
  WHERE LOWER(primeiro_nome) = 'ulisses' 
  LIMIT 1;
  
  -- Buscar equipe do vendedor (se houver)
  SELECT equipe_id INTO v_equipe_id
  FROM membros_equipe
  WHERE usuario_id = v_vendedor_id AND esta_ativo = true
  LIMIT 1;
  
  -- Se encontrou o vendedor e ele não tem meta ativa
  IF v_vendedor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM metas_vendedor 
      WHERE vendedor_id = v_vendedor_id 
      AND status = 'ativa'
      AND periodo_fim >= CURRENT_DATE
    ) THEN
      -- Criar meta para o mês atual
      INSERT INTO metas_vendedor (
        vendedor_id,
        equipe_id,
        periodo_inicio,
        periodo_fim,
        meta_valor,
        meta_unidades,
        valor_atual,
        status
      ) VALUES (
        v_vendedor_id,
        v_equipe_id,
        date_trunc('month', CURRENT_DATE)::date,
        (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
        50000.00,  -- Meta de R$ 50.000
        20,        -- Meta de 20 unidades
        15000.00,  -- Valor atual: R$ 15.000 (30% da meta)
        'ativa'
      );
    END IF;
  END IF;
END $$;