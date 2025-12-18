-- =============================================================================
-- FASE 2: Tabela de Metadados de Campos Customizados (FINAL)
-- =============================================================================

-- 2.1 - Criar ENUM se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_field_tipo') THEN
    CREATE TYPE custom_field_tipo AS ENUM (
      'text', 'textarea', 'number', 'decimal', 'currency', 'percentage',
      'date', 'datetime', 'select', 'multiselect', 'checkbox', 'radio',
      'email', 'phone', 'url', 'cnpj', 'cpf', 'cep', 'file', 'user', 'client', 'product'
    );
  END IF;
END $$;

-- 2.2 - Criar tabela pipeline_custom_fields
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  estagio_id UUID REFERENCES estagios_pipeline(id) ON DELETE CASCADE,
  
  nome_campo VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  placeholder VARCHAR(200),
  dica VARCHAR(500),
  
  tipo_campo custom_field_tipo NOT NULL DEFAULT 'text',
  opcoes JSONB DEFAULT '[]',
  valor_padrao JSONB,
  
  obrigatorio BOOLEAN DEFAULT false,
  validacao JSONB DEFAULT '{}',
  
  ordem INTEGER DEFAULT 0,
  grupo VARCHAR(100),
  largura VARCHAR(20) DEFAULT 'full',
  visivel_kanban BOOLEAN DEFAULT false,
  visivel_lista BOOLEAN DEFAULT true,
  visivel_formulario BOOLEAN DEFAULT true,
  
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_campo_pipeline UNIQUE(pipeline_id, nome_campo),
  CONSTRAINT unique_campo_estagio UNIQUE(pipeline_id, estagio_id, nome_campo)
);

-- 2.3 - Índices
CREATE INDEX IF NOT EXISTS idx_pcf_pipeline ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pcf_estagio ON pipeline_custom_fields(estagio_id) WHERE estagio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pcf_ativo ON pipeline_custom_fields(pipeline_id, ativo) WHERE ativo = true;

-- 2.4 - Trigger para timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp_pcf()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_pcf_updated_at ON pipeline_custom_fields;
CREATE TRIGGER trg_pcf_updated_at
  BEFORE UPDATE ON pipeline_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp_pcf();

-- 2.5 - RLS
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pcf_select_authenticated" ON pipeline_custom_fields;
CREATE POLICY "pcf_select_authenticated"
  ON pipeline_custom_fields FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pcf_insert_authenticated" ON pipeline_custom_fields;
CREATE POLICY "pcf_insert_authenticated"
  ON pipeline_custom_fields FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pcf_update_authenticated" ON pipeline_custom_fields;
CREATE POLICY "pcf_update_authenticated"
  ON pipeline_custom_fields FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pcf_delete_authenticated" ON pipeline_custom_fields;
CREATE POLICY "pcf_delete_authenticated"
  ON pipeline_custom_fields FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 2.6 - Função auxiliar
CREATE OR REPLACE FUNCTION get_pipeline_fields(
  p_pipeline_id UUID,
  p_estagio_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nome_campo VARCHAR,
  label VARCHAR,
  tipo_campo custom_field_tipo,
  obrigatorio BOOLEAN,
  opcoes JSONB,
  validacao JSONB,
  ordem INTEGER,
  grupo VARCHAR,
  largura VARCHAR,
  visivel_kanban BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcf.id, pcf.nome_campo, pcf.label, pcf.tipo_campo, pcf.obrigatorio,
    pcf.opcoes, pcf.validacao, pcf.ordem, pcf.grupo, pcf.largura, pcf.visivel_kanban
  FROM pipeline_custom_fields pcf
  WHERE pcf.pipeline_id = p_pipeline_id
    AND pcf.ativo = true
    AND (pcf.estagio_id IS NULL OR pcf.estagio_id = p_estagio_id)
  ORDER BY pcf.ordem, pcf.criado_em;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;