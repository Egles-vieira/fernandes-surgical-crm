-- =============================================================================
-- FASE 1: Evolução do Schema para Multi-Pipeline
-- Objetivo: Adicionar colunas JSONB às tabelas existentes SEM criar nova tabela
-- =============================================================================

-- 1.1 - Evoluir tabela PIPELINES
-- Adiciona configurações flexíveis e metadados visuais
ALTER TABLE pipelines 
  ADD COLUMN IF NOT EXISTS configuracoes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cor VARCHAR(20) DEFAULT '#3B82F6';

-- Comentários para documentação
COMMENT ON COLUMN pipelines.configuracoes IS 'Configurações flexíveis do pipeline: automações, regras, permissões';
COMMENT ON COLUMN pipelines.icone IS 'Ícone do pipeline (nome do ícone Lucide)';
COMMENT ON COLUMN pipelines.cor IS 'Cor principal do pipeline em hexadecimal';

-- 1.2 - Evoluir tabela ESTAGIOS_PIPELINE
-- Adiciona campos obrigatórios, validações e alertas por estágio
ALTER TABLE estagios_pipeline
  ADD COLUMN IF NOT EXISTS campos_obrigatorios JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS validacoes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS automacoes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS alerta_estagnacao_dias INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN estagios_pipeline.campos_obrigatorios IS 'Array de nomes de campos obrigatórios para entrar neste estágio';
COMMENT ON COLUMN estagios_pipeline.validacoes IS 'Regras de validação para transição de estágio';
COMMENT ON COLUMN estagios_pipeline.automacoes IS 'Ações automáticas ao entrar/sair do estágio';
COMMENT ON COLUMN estagios_pipeline.alerta_estagnacao_dias IS 'Dias para alertar sobre oportunidade estagnada';

-- 1.3 - Evoluir tabela OPORTUNIDADES (será nossa tabela de "deals")
-- Adiciona campos customizados polimórficos e código único
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS campos_customizados JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS venda_id UUID REFERENCES vendas(id),
  ADD COLUMN IF NOT EXISTS dias_no_estagio INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_entrada_estagio TIMESTAMPTZ DEFAULT now();

-- Comentários para documentação
COMMENT ON COLUMN oportunidades.campos_customizados IS 'Campos dinâmicos específicos do pipeline (polimorfismo via JSONB)';
COMMENT ON COLUMN oportunidades.codigo IS 'Código único da oportunidade (ex: SP-2412-0001)';
COMMENT ON COLUMN oportunidades.venda_id IS 'Referência à venda quando oportunidade é convertida';
COMMENT ON COLUMN oportunidades.dias_no_estagio IS 'Contador de dias no estágio atual';
COMMENT ON COLUMN oportunidades.data_entrada_estagio IS 'Data/hora de entrada no estágio atual';

-- 1.4 - Criar ÍNDICES otimizados
-- Índice GIN para busca eficiente em campos_customizados
CREATE INDEX IF NOT EXISTS idx_oportunidades_campos_custom 
  ON oportunidades USING GIN (campos_customizados jsonb_path_ops);

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_oportunidades_codigo 
  ON oportunidades(codigo) WHERE codigo IS NOT NULL;

-- Índice para filtro por venda_id
CREATE INDEX IF NOT EXISTS idx_oportunidades_venda_id 
  ON oportunidades(venda_id) WHERE venda_id IS NOT NULL;

-- 1.5 - Função para gerar código automático de oportunidade
CREATE OR REPLACE FUNCTION gerar_codigo_oportunidade()
RETURNS TRIGGER AS $$
DECLARE
  v_prefixo VARCHAR(3);
  v_ano_mes VARCHAR(4);
  v_sequencial INTEGER;
  v_codigo VARCHAR(20);
BEGIN
  -- Obter prefixo do pipeline (primeiras 2 letras ou SP para spot)
  SELECT COALESCE(
    UPPER(LEFT(REGEXP_REPLACE(p.nome, '[^a-zA-Z]', '', 'g'), 2)),
    'SP'
  ) INTO v_prefixo
  FROM pipelines p
  WHERE p.id = NEW.pipeline_id;
  
  -- Formato: YYMM
  v_ano_mes := TO_CHAR(NOW(), 'YYMM');
  
  -- Obter próximo sequencial do mês
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1 INTO v_sequencial
  FROM oportunidades
  WHERE codigo LIKE v_prefixo || '-' || v_ano_mes || '-%';
  
  -- Montar código: XX-YYMM-0001
  v_codigo := v_prefixo || '-' || v_ano_mes || '-' || LPAD(v_sequencial::TEXT, 4, '0');
  
  NEW.codigo := v_codigo;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente
DROP TRIGGER IF EXISTS trg_gerar_codigo_oportunidade ON oportunidades;
CREATE TRIGGER trg_gerar_codigo_oportunidade
  BEFORE INSERT ON oportunidades
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL)
  EXECUTE FUNCTION gerar_codigo_oportunidade();

-- 1.6 - Função para tracking de dias no estágio
CREATE OR REPLACE FUNCTION atualizar_dias_estagio_oportunidade()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de estágio, resetar contador
  IF OLD.estagio_id IS DISTINCT FROM NEW.estagio_id THEN
    NEW.dias_no_estagio := 0;
    NEW.data_entrada_estagio := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tracking de estágio
DROP TRIGGER IF EXISTS trg_atualizar_dias_estagio ON oportunidades;
CREATE TRIGGER trg_atualizar_dias_estagio
  BEFORE UPDATE ON oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_dias_estagio_oportunidade();