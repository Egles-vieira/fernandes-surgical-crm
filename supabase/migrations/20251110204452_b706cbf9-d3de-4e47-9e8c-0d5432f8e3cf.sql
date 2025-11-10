-- Tabela de metas individuais dos vendedores
CREATE TABLE IF NOT EXISTS metas_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
  periodo_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  periodo_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  meta_valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  meta_unidades INTEGER DEFAULT 0,
  meta_margem NUMERIC(5,2) DEFAULT 0,
  meta_conversao NUMERIC(5,2) DEFAULT 0,
  valor_atual NUMERIC(15,2) DEFAULT 0,
  unidades_atual INTEGER DEFAULT 0,
  margem_atual NUMERIC(5,2) DEFAULT 0,
  conversao_atual NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_vendedor ON metas_vendedor(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_equipe ON metas_vendedor(equipe_id);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_periodo ON metas_vendedor(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_status ON metas_vendedor(status);

-- RLS Policies
ALTER TABLE metas_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores podem ver suas próprias metas"
  ON metas_vendedor FOR SELECT
  USING (
    vendedor_id = auth.uid() OR
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'lider'::app_role])
  );

CREATE POLICY "Gestores podem criar metas"
  ON metas_vendedor FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'lider'::app_role])
  );

CREATE POLICY "Gestores podem atualizar metas"
  ON metas_vendedor FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'lider'::app_role])
  );

-- View de performance de vendedores
CREATE OR REPLACE VIEW vw_performance_vendedor AS
WITH vendas_periodo AS (
  SELECT 
    v.vendedor_id,
    COUNT(*) FILTER (WHERE v.status = 'aprovado') as total_vendas,
    COUNT(*) FILTER (WHERE v.etapa_pipeline = 'ganho') as vendas_ganhas,
    COUNT(*) FILTER (WHERE v.etapa_pipeline = 'perdido') as vendas_perdidas,
    SUM(v.valor_final) FILTER (WHERE v.status = 'aprovado') as valor_vendido,
    AVG(v.valor_final) FILTER (WHERE v.status = 'aprovado') as ticket_medio,
    COUNT(DISTINCT DATE(v.data_venda)) as dias_com_venda
  FROM vendas v
  WHERE v.data_venda >= date_trunc('month', CURRENT_DATE)
  GROUP BY v.vendedor_id
),
oportunidades_periodo AS (
  SELECT 
    o.vendedor_id,
    COUNT(*) as total_oportunidades,
    COUNT(*) FILTER (WHERE o.foi_ganha) as oportunidades_ganhas,
    AVG(o.percentual_probabilidade) as probabilidade_media
  FROM oportunidades o
  WHERE o.criado_em >= date_trunc('month', CURRENT_DATE)
  GROUP BY o.vendedor_id
)
SELECT 
  p.id as vendedor_id,
  p.primeiro_nome || ' ' || COALESCE(p.sobrenome, '') as nome_vendedor,
  COALESCE(mv.meta_valor, 0) as meta_valor,
  COALESCE(mv.valor_atual, 0) as realizado_valor,
  CASE 
    WHEN COALESCE(mv.meta_valor, 0) > 0 
    THEN (COALESCE(mv.valor_atual, 0) / mv.meta_valor * 100)
    ELSE 0 
  END as percentual_atingimento,
  COALESCE(vp.total_vendas, 0) as total_vendas,
  COALESCE(vp.vendas_ganhas, 0) as vendas_ganhas,
  COALESCE(vp.vendas_perdidas, 0) as vendas_perdidas,
  COALESCE(vp.valor_vendido, 0) as valor_vendido,
  COALESCE(vp.ticket_medio, 0) as ticket_medio,
  CASE 
    WHEN COALESCE(op.total_oportunidades, 0) > 0 
    THEN (COALESCE(op.oportunidades_ganhas, 0)::NUMERIC / op.total_oportunidades * 100)
    ELSE 0 
  END as taxa_conversao,
  COALESCE(mv.margem_atual, 0) as margem_media,
  COALESCE(op.probabilidade_media, 0) as probabilidade_media,
  me.equipe_id,
  e.nome as equipe_nome
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
  AND ur.role IN ('sales', 'representante_comercial', 'executivo_contas')
);

-- RLS para a view
ALTER VIEW vw_performance_vendedor SET (security_invoker = on);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_meta_vendedor_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_meta_vendedor
  BEFORE UPDATE ON metas_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_meta_vendedor_timestamp();