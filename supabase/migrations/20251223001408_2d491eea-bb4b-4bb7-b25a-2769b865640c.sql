-- Corrigir tipo de origem_lead na função RPC (VARCHAR(100) -> TEXT cast)
DROP FUNCTION IF EXISTS get_oportunidades_pipeline_paginado(UUID, JSONB, INT);

CREATE OR REPLACE FUNCTION get_oportunidades_pipeline_paginado(
  p_pipeline_id UUID,
  p_limites_por_estagio JSONB DEFAULT '{}',
  p_limite_default INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  codigo TEXT,
  nome_oportunidade TEXT,
  valor NUMERIC,
  data_fechamento DATE,
  estagio_id UUID,
  percentual_probabilidade INT,
  dias_no_estagio INT,
  campos_customizados JSONB,
  conta_nome TEXT,
  contato_nome TEXT,
  total_estagio BIGINT,
  valor_total_estagio NUMERIC,
  row_num BIGINT,
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
      AND o.status = 'aberto'
      AND o.excluido_em IS NULL
    GROUP BY o.estagio_id
  ),
  oportunidades_numeradas AS (
    SELECT
      o.id,
      o.codigo,
      o.nome_oportunidade,
      o.valor,
      o.data_fechamento,
      o.estagio_id,
      ep.percentual_probabilidade,
      EXTRACT(DAY FROM NOW() - COALESCE(o.data_entrada_estagio, o.criado_em))::INT as dias_no_estagio,
      o.campos_customizados,
      c.nome_conta as conta_nome,
      CONCAT(ct.primeiro_nome, ' ', ct.sobrenome) as contato_nome,
      COALESCE(t.total, 0) as total_estagio,
      COALESCE(t.valor_total, 0) as valor_total_estagio,
      o.origem_lead::TEXT as origem_lead,
      ROW_NUMBER() OVER (
        PARTITION BY o.estagio_id 
        ORDER BY ep.ordem_estagio, o.criado_em DESC
      ) as row_num
    FROM oportunidades o
    INNER JOIN estagios_pipeline ep ON ep.id = o.estagio_id
    LEFT JOIN contas c ON c.id = o.conta_id
    LEFT JOIN contatos ct ON ct.id = o.contato_id
    LEFT JOIN totais_por_estagio t ON t.estagio_id = o.estagio_id
    WHERE o.pipeline_id = p_pipeline_id
      AND o.status = 'aberto'
      AND o.excluido_em IS NULL
  )
  SELECT
    on2.id,
    on2.codigo,
    on2.nome_oportunidade,
    on2.valor,
    on2.data_fechamento,
    on2.estagio_id,
    on2.percentual_probabilidade,
    on2.dias_no_estagio,
    on2.campos_customizados,
    on2.conta_nome,
    on2.contato_nome,
    on2.total_estagio,
    on2.valor_total_estagio,
    on2.row_num,
    on2.origem_lead
  FROM oportunidades_numeradas on2
  WHERE on2.row_num <= COALESCE(
    (p_limites_por_estagio->>on2.estagio_id::TEXT)::INT,
    p_limite_default
  )
  ORDER BY on2.estagio_id, on2.row_num;
END;
$$;