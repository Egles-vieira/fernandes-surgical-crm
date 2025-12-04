
-- =====================================================
-- MÓDULO GED - Gestão Eletrônica de Documentos
-- =====================================================

-- 1. Tipos de Documentos (Configurável)
CREATE TABLE ged_tipos_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'file',
  cor TEXT DEFAULT '#6366f1',
  exige_validade BOOLEAN DEFAULT true,
  dias_alerta_vencimento INTEGER DEFAULT 30,
  permite_versoes BOOLEAN DEFAULT true,
  extensoes_permitidas TEXT[] DEFAULT ARRAY['pdf'],
  ativo BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Documentos Principal
CREATE TABLE ged_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id UUID REFERENCES ged_tipos_documento(id) NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  numero_documento TEXT,
  data_emissao DATE,
  data_validade DATE,
  status_validade TEXT DEFAULT 'sem_validade',
  versao INTEGER DEFAULT 1,
  versao_label TEXT DEFAULT '1.0',
  documento_pai_id UUID REFERENCES ged_documentos(id),
  eh_versao_atual BOOLEAN DEFAULT true,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  tamanho_bytes BIGINT,
  tipo_mime TEXT,
  metadados JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  criado_por UUID REFERENCES auth.users(id) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Controle de Acesso por Níveis
CREATE TABLE ged_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES ged_documentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('todos', 'role', 'equipe', 'usuario')),
  role_nome TEXT,
  equipe_id UUID REFERENCES equipes(id),
  usuario_id UUID REFERENCES auth.users(id),
  nivel TEXT DEFAULT 'visualizar' CHECK (nivel IN ('visualizar', 'download', 'editar')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  CONSTRAINT check_permissao_ref CHECK (
    (tipo = 'todos') OR
    (tipo = 'role' AND role_nome IS NOT NULL) OR
    (tipo = 'equipe' AND equipe_id IS NOT NULL) OR
    (tipo = 'usuario' AND usuario_id IS NOT NULL)
  )
);

-- 4. Histórico de Visualizações
CREATE TABLE ged_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES ged_documentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('visualizou', 'baixou', 'imprimiu')),
  tempo_visualizacao_segundos INTEGER DEFAULT 0,
  dispositivo TEXT,
  navegador TEXT,
  ip_origem INET,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. Alertas de Vencimento
CREATE TABLE ged_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES ged_documentos(id) ON DELETE CASCADE,
  dias_antes INTEGER NOT NULL,
  enviado BOOLEAN DEFAULT false,
  enviado_em TIMESTAMPTZ,
  usuarios_notificados UUID[] DEFAULT ARRAY[]::UUID[]
);

-- =====================================================
-- FUNÇÃO PARA CALCULAR STATUS DE VALIDADE
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_status_validade_ged()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_validade IS NULL THEN
    NEW.status_validade := 'sem_validade';
  ELSIF NEW.data_validade < CURRENT_DATE THEN
    NEW.status_validade := 'vencido';
  ELSIF NEW.data_validade <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status_validade := 'vencendo';
  ELSE
    NEW.status_validade := 'valido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ged_status_validade
  BEFORE INSERT OR UPDATE OF data_validade ON ged_documentos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_status_validade_ged();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_ged_docs_tipo ON ged_documentos(tipo_id);
CREATE INDEX idx_ged_docs_validade ON ged_documentos(data_validade) WHERE data_validade IS NOT NULL;
CREATE INDEX idx_ged_docs_status ON ged_documentos(status_validade);
CREATE INDEX idx_ged_docs_criado_por ON ged_documentos(criado_por);
CREATE INDEX idx_ged_docs_versao_atual ON ged_documentos(documento_pai_id) WHERE eh_versao_atual = true;
CREATE INDEX idx_ged_permissoes_doc ON ged_permissoes(documento_id);
CREATE INDEX idx_ged_visualizacoes_doc ON ged_visualizacoes(documento_id, criado_em DESC);

-- =====================================================
-- MATERIALIZED VIEWS PARA DASHBOARD
-- =====================================================
CREATE MATERIALIZED VIEW mv_ged_resumo AS
SELECT 
  COUNT(*) as total_documentos,
  COUNT(*) FILTER (WHERE status_validade = 'valido') as docs_validos,
  COUNT(*) FILTER (WHERE status_validade = 'vencendo') as docs_vencendo,
  COUNT(*) FILTER (WHERE status_validade = 'vencido') as docs_vencidos,
  COUNT(*) FILTER (WHERE status_validade = 'sem_validade') as docs_sem_validade,
  COUNT(DISTINCT tipo_id) as total_tipos,
  COALESCE(SUM(tamanho_bytes), 0) as total_bytes
FROM ged_documentos
WHERE eh_versao_atual = true;

CREATE UNIQUE INDEX idx_mv_ged_resumo ON mv_ged_resumo ((1));

CREATE MATERIALIZED VIEW mv_ged_por_tipo AS
SELECT 
  t.id as tipo_id,
  t.nome as tipo_nome,
  t.icone,
  t.cor,
  COUNT(d.id) as total,
  COUNT(d.id) FILTER (WHERE d.status_validade = 'vencendo') as vencendo,
  COUNT(d.id) FILTER (WHERE d.status_validade = 'vencido') as vencidos
FROM ged_tipos_documento t
LEFT JOIN ged_documentos d ON d.tipo_id = t.id AND d.eh_versao_atual = true
WHERE t.ativo = true
GROUP BY t.id, t.nome, t.icone, t.cor;

CREATE UNIQUE INDEX idx_mv_ged_por_tipo ON mv_ged_por_tipo (tipo_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Tipos de documento
ALTER TABLE ged_tipos_documento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ged_tipos_select" ON ged_tipos_documento FOR SELECT USING (true);
CREATE POLICY "ged_tipos_insert" ON ged_tipos_documento FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "ged_tipos_update" ON ged_tipos_documento FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "ged_tipos_delete" ON ged_tipos_documento FOR DELETE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Documentos
ALTER TABLE ged_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ged_docs_select" ON ged_documentos FOR SELECT
USING (
  criado_por = auth.uid() OR
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) OR
  EXISTS (
    SELECT 1 FROM ged_permissoes p
    WHERE p.documento_id = id AND (
      p.tipo = 'todos' OR
      (p.tipo = 'usuario' AND p.usuario_id = auth.uid()) OR
      (p.tipo = 'role' AND p.role_nome IN (SELECT role::text FROM user_roles WHERE user_id = auth.uid())) OR
      (p.tipo = 'equipe' AND p.equipe_id IN (SELECT equipe_id FROM membros_equipe WHERE usuario_id = auth.uid() AND esta_ativo = true))
    )
  )
);
CREATE POLICY "ged_docs_insert" ON ged_documentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ged_docs_update" ON ged_documentos FOR UPDATE
USING (
  criado_por = auth.uid() OR
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) OR
  EXISTS (
    SELECT 1 FROM ged_permissoes p
    WHERE p.documento_id = id AND p.nivel = 'editar' AND (
      (p.tipo = 'usuario' AND p.usuario_id = auth.uid()) OR
      (p.tipo = 'role' AND p.role_nome IN (SELECT role::text FROM user_roles WHERE user_id = auth.uid())) OR
      (p.tipo = 'equipe' AND p.equipe_id IN (SELECT equipe_id FROM membros_equipe WHERE usuario_id = auth.uid() AND esta_ativo = true))
    )
  )
);
CREATE POLICY "ged_docs_delete" ON ged_documentos FOR DELETE
USING (criado_por = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Permissões
ALTER TABLE ged_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ged_permissoes_select" ON ged_permissoes FOR SELECT USING (true);
CREATE POLICY "ged_permissoes_insert" ON ged_permissoes FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) OR EXISTS (SELECT 1 FROM ged_documentos d WHERE d.id = documento_id AND d.criado_por = auth.uid()));
CREATE POLICY "ged_permissoes_update" ON ged_permissoes FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) OR EXISTS (SELECT 1 FROM ged_documentos d WHERE d.id = documento_id AND d.criado_por = auth.uid()));
CREATE POLICY "ged_permissoes_delete" ON ged_permissoes FOR DELETE 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) OR EXISTS (SELECT 1 FROM ged_documentos d WHERE d.id = documento_id AND d.criado_por = auth.uid()));

-- Visualizações
ALTER TABLE ged_visualizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ged_visualizacoes_insert" ON ged_visualizacoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ged_visualizacoes_select" ON ged_visualizacoes FOR SELECT 
USING (usuario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) OR EXISTS (SELECT 1 FROM ged_documentos d WHERE d.id = documento_id AND d.criado_por = auth.uid()));

-- Alertas
ALTER TABLE ged_alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ged_alertas_select" ON ged_alertas FOR SELECT USING (true);
CREATE POLICY "ged_alertas_insert" ON ged_alertas FOR INSERT WITH CHECK (true);
CREATE POLICY "ged_alertas_update" ON ged_alertas FOR UPDATE USING (true);
CREATE POLICY "ged_alertas_delete" ON ged_alertas FOR DELETE USING (true);

-- =====================================================
-- TRIGGER updated_at
-- =====================================================
CREATE TRIGGER ged_documentos_updated_at BEFORE UPDATE ON ged_documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('ged-documentos', 'ged-documentos', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "ged_storage_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ged-documentos' AND auth.uid() IS NOT NULL);
CREATE POLICY "ged_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'ged-documentos' AND auth.uid() IS NOT NULL);
CREATE POLICY "ged_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'ged-documentos' AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- =====================================================
-- FUNÇÃO PARA REFRESH DAS MVs
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_ged_mvs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ged_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ged_por_tipo;
END;
$$;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================
INSERT INTO ged_tipos_documento (nome, descricao, icone, cor, exige_validade, dias_alerta_vencimento, extensoes_permitidas) VALUES
('CND Federal', 'Certidão Negativa de Débitos Federais', 'file-check', '#22c55e', true, 30, ARRAY['pdf']),
('CND Estadual', 'Certidão Negativa de Débitos Estaduais', 'file-check', '#3b82f6', true, 30, ARRAY['pdf']),
('CND Municipal', 'Certidão Negativa de Débitos Municipais', 'file-check', '#8b5cf6', true, 30, ARRAY['pdf']),
('CND FGTS', 'Certidão de Regularidade do FGTS', 'file-check', '#f59e0b', true, 30, ARRAY['pdf']),
('CND Trabalhista', 'Certidão Negativa de Débitos Trabalhistas', 'file-check', '#ef4444', true, 30, ARRAY['pdf']),
('Catálogo', 'Catálogos de Produtos', 'book-open', '#6366f1', false, 0, ARRAY['pdf']),
('Contrato', 'Contratos e Acordos', 'file-text', '#0ea5e9', true, 60, ARRAY['pdf', 'doc', 'docx']),
('Licença', 'Licenças e Autorizações', 'shield-check', '#10b981', true, 45, ARRAY['pdf']),
('Alvará', 'Alvarás de Funcionamento', 'building', '#f97316', true, 30, ARRAY['pdf']),
('Procuração', 'Procurações', 'user-check', '#84cc16', true, 365, ARRAY['pdf']),
('Proposta Técnica', 'Propostas Técnicas para Licitações', 'clipboard-list', '#14b8a6', false, 0, ARRAY['pdf', 'doc', 'docx']),
('Atestado de Capacidade', 'Atestados de Capacidade Técnica', 'award', '#a855f7', true, 365, ARRAY['pdf']),
('Outros', 'Outros documentos', 'file', '#64748b', false, 0, ARRAY['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png']);

GRANT SELECT ON mv_ged_resumo TO anon, authenticated;
GRANT SELECT ON mv_ged_por_tipo TO anon, authenticated;
