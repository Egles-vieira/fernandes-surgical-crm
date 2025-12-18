-- Índice composto para consultas de oportunidades por pipeline/estágio
CREATE INDEX IF NOT EXISTS idx_oportunidades_pipeline_estagio_criado 
ON oportunidades(pipeline_id, estagio_id, criado_em DESC)
WHERE excluido_em IS NULL AND esta_fechada = false;

-- Índice GIN para campos customizados
CREATE INDEX IF NOT EXISTS idx_oportunidades_campos_gin 
ON oportunidades USING GIN (campos_customizados);

-- Função RPC para buscar oportunidades paginadas por estágio
CREATE OR REPLACE FUNCTION get_oportunidades_pipeline_paginado(
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
  conta_nome VARCHAR,
  contato_nome VARCHAR,
  total_estagio BIGINT,
  valor_total_estagio DECIMAL
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
      c.nome_conta as conta_nome,
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
      t.valor_total as valor_total_estagio
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
    on2.valor_total_estagio
  FROM oportunidades_numeradas on2
  WHERE on2.rn <= COALESCE(
    (p_limites_por_estagio->>on2.estagio_id::text)::int, 
    p_limite_default
  )
  ORDER BY on2.estagio_id, on2.rn;
END;
$$;