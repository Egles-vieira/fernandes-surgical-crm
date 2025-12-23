-- Atualizar função para incluir origem_lead
DROP FUNCTION IF EXISTS get_oportunidades_pipeline_paginado(UUID, JSONB, INT);

CREATE FUNCTION get_oportunidades_pipeline_paginado(
  p_pipeline_id UUID,
  p_limites_por_estagio JSONB DEFAULT '{}',
  p_limite_default INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  codigo VARCHAR,
  nome_oportunidade VARCHAR,
  valor DECIMAL,
  percentual_probabilidade INT,
  dias_no_estagio INT,
  data_fechamento DATE,
  estagio_id UUID,
  campos_customizados JSONB,
  proprietario_id UUID,
  conta_nome TEXT,
  contato_nome TEXT,
  total_estagio BIGINT,
  valor_total_estagio DECIMAL,
  origem_lead TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH totais_por_estagio AS (
    SELECT 
      o.estagio_id,
      COUNT(*) as total,
      COALESCE(SUM(o.valor), 0) as valor_total
    FROM oportunidades o
    WHERE o.pipeline_id = p_pipeline_id
      AND o.esta_fechada = false
      AND o.excluido_em IS NULL
    GROUP BY o.estagio_id
  ),
  oportunidades_numeradas AS (
    SELECT 
      o.id,
      o.codigo,
      o.nome_oportunidade,
      o.valor,
      o.percentual_probabilidade,
      o.dias_no_estagio,
      o.data_fechamento,
      o.estagio_id,
      o.campos_customizados,
      o.proprietario_id,
      c.nome_conta::TEXT as conta_nome,
      CASE 
        WHEN ct.primeiro_nome IS NOT NULL 
        THEN CONCAT(ct.primeiro_nome, ' ', ct.sobrenome)
        ELSE NULL
      END as contato_nome,
      ROW_NUMBER() OVER (
        PARTITION BY o.estagio_id 
        ORDER BY o.criado_em DESC
      ) as rn,
      t.total as total_estagio,
      t.valor_total as valor_total_estagio,
      o.origem_lead
    FROM oportunidades o
    LEFT JOIN contas c ON c.id = o.conta_id
    LEFT JOIN contatos ct ON ct.id = o.contato_id
    LEFT JOIN totais_por_estagio t ON t.estagio_id = o.estagio_id
    WHERE o.pipeline_id = p_pipeline_id
      AND o.esta_fechada = false
      AND o.excluido_em IS NULL
  )
  SELECT 
    on2.id,
    on2.codigo,
    on2.nome_oportunidade,
    on2.valor,
    on2.percentual_probabilidade,
    on2.dias_no_estagio,
    on2.data_fechamento,
    on2.estagio_id,
    on2.campos_customizados,
    on2.proprietario_id,
    on2.conta_nome,
    on2.contato_nome,
    on2.total_estagio,
    on2.valor_total_estagio,
    on2.origem_lead
  FROM oportunidades_numeradas on2
  WHERE on2.rn <= COALESCE(
    (p_limites_por_estagio->>on2.estagio_id::text)::int, 
    p_limite_default
  )
  ORDER BY on2.estagio_id, on2.rn;
END;
$$;