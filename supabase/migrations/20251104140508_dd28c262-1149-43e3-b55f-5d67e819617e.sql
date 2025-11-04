-- ============================================
-- MIGRAÇÃO: Sistema Inteligente de Cadastro via CNPJ (CORRIGIDA)
-- ============================================

-- 1. Expandir tabela clientes com novos campos
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
ADD COLUMN IF NOT EXISTS data_abertura DATE,
ADD COLUMN IF NOT EXISTS eh_matriz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS situacao_cadastral TEXT,
ADD COLUMN IF NOT EXISTS porte TEXT,
ADD COLUMN IF NOT EXISTS capital_social DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS natureza_juridica TEXT,
ADD COLUMN IF NOT EXISTS cnae_principal TEXT,
ADD COLUMN IF NOT EXISTS cnae_descricao TEXT,
ADD COLUMN IF NOT EXISTS regime_tributario TEXT,
ADD COLUMN IF NOT EXISTS optante_simples BOOLEAN,
ADD COLUMN IF NOT EXISTS optante_mei BOOLEAN,
ADD COLUMN IF NOT EXISTS data_opcao_simples DATE,
ADD COLUMN IF NOT EXISTS inscricao_suframa TEXT,
ADD COLUMN IF NOT EXISTS situacao_suframa TEXT,
ADD COLUMN IF NOT EXISTS dados_cnpja JSONB,
ADD COLUMN IF NOT EXISTS ultima_consulta_cnpja TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadados_consulta JSONB;

-- 2. Tabela para armazenar endereços completos
CREATE TABLE IF NOT EXISTS cliente_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  codigo_ibge TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  validado BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. Tabela para armazenar filiais
CREATE TABLE IF NOT EXISTS cliente_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_matriz_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  nome_fantasia TEXT,
  razao_social TEXT,
  situacao TEXT,
  endereco JSONB,
  telefones JSONB,
  emails JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- 4. Tabela para armazenar inscrições estaduais
CREATE TABLE IF NOT EXISTS cliente_inscricoes_estaduais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  uf TEXT NOT NULL,
  inscricao_estadual TEXT,
  situacao TEXT,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- 5. Tabela para armazenar sócios/quadro societário
CREATE TABLE IF NOT EXISTS cliente_socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  qualificacao TEXT,
  data_entrada DATE,
  percentual_participacao DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT now()
);

-- 6. Tabela para log de consultas à API
CREATE TABLE IF NOT EXISTS cliente_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  tipo_consulta TEXT NOT NULL,
  decisao_tomada BOOLEAN,
  motivo_decisao TEXT,
  custo_creditos INTEGER DEFAULT 0,
  tempo_resposta_ms INTEGER,
  sucesso BOOLEAN,
  erro TEXT,
  dados_resposta JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- 7. Tabela para armazenar comprovantes/documentos
CREATE TABLE IF NOT EXISTS cliente_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  tamanho_bytes INTEGER,
  created_at TIMESTAMP DEFAULT now()
);

-- 8. Tabela para configurações do sistema CNPJA
CREATE TABLE IF NOT EXISTS cnpja_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sempre_validar_cep BOOLEAN DEFAULT true,
  trabalha_com_icms BOOLEAN DEFAULT true,
  operacoes_interestaduais BOOLEAN DEFAULT true,
  emite_nf BOOLEAN DEFAULT true,
  gerar_comprovantes_automaticamente BOOLEAN DEFAULT false,
  tempo_cache_office_dias INTEGER DEFAULT 30,
  tempo_cache_company_dias INTEGER DEFAULT 30,
  tempo_cache_simples_dias INTEGER DEFAULT 30,
  tempo_cache_sintegra_dias INTEGER DEFAULT 90,
  tempo_cache_suframa_dias INTEGER DEFAULT 180,
  limite_consultas_simultaneas INTEGER DEFAULT 5,
  configs_extras JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cgc);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpja_consulta ON clientes(ultima_consulta_cnpja);
CREATE INDEX IF NOT EXISTS idx_filiais_matriz ON cliente_filiais(cliente_matriz_id);
CREATE INDEX IF NOT EXISTS idx_ie_cliente ON cliente_inscricoes_estaduais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_cliente ON cliente_api_logs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_data ON cliente_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_enderecos_cliente ON cliente_enderecos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_socios_cliente ON cliente_socios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON cliente_documentos(cliente_id);

-- 10. RLS Policies para novas tabelas
ALTER TABLE cliente_enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_inscricoes_estaduais ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cnpja_configuracoes ENABLE ROW LEVEL SECURITY;

-- Remover policies existentes se houver
DROP POLICY IF EXISTS "Usuários podem gerenciar endereços de seus clientes" ON cliente_enderecos;
DROP POLICY IF EXISTS "Usuários podem gerenciar filiais de seus clientes" ON cliente_filiais;
DROP POLICY IF EXISTS "Usuários podem gerenciar IEs de seus clientes" ON cliente_inscricoes_estaduais;
DROP POLICY IF EXISTS "Usuários podem gerenciar sócios de seus clientes" ON cliente_socios;
DROP POLICY IF EXISTS "Usuários podem visualizar logs de API de seus clientes" ON cliente_api_logs;
DROP POLICY IF EXISTS "Sistema pode inserir logs de API" ON cliente_api_logs;
DROP POLICY IF EXISTS "Usuários podem gerenciar documentos de seus clientes" ON cliente_documentos;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias configurações" ON cnpja_configuracoes;

-- Criar policies
CREATE POLICY "Usuários podem gerenciar endereços de seus clientes"
  ON cliente_enderecos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = cliente_enderecos.cliente_id
      AND can_access_cliente(auth.uid(), clientes.id)
    )
  );

CREATE POLICY "Usuários podem gerenciar filiais de seus clientes"
  ON cliente_filiais FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = cliente_filiais.cliente_matriz_id
      AND can_access_cliente(auth.uid(), clientes.id)
    )
  );

CREATE POLICY "Usuários podem gerenciar IEs de seus clientes"
  ON cliente_inscricoes_estaduais FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = cliente_inscricoes_estaduais.cliente_id
      AND can_access_cliente(auth.uid(), clientes.id)
    )
  );

CREATE POLICY "Usuários podem gerenciar sócios de seus clientes"
  ON cliente_socios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = cliente_socios.cliente_id
      AND can_access_cliente(auth.uid(), clientes.id)
    )
  );

CREATE POLICY "Usuários podem visualizar logs de API de seus clientes"
  ON cliente_api_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = cliente_api_logs.cliente_id
      AND can_access_cliente(auth.uid(), clientes.id)
    )
  );

CREATE POLICY "Sistema pode inserir logs de API"
  ON cliente_api_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem gerenciar documentos de seus clientes"
  ON cliente_documentos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = cliente_documentos.cliente_id
      AND can_access_cliente(auth.uid(), clientes.id)
    )
  );

CREATE POLICY "Usuários podem gerenciar suas próprias configurações"
  ON cnpja_configuracoes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. Triggers para updated_at
DROP TRIGGER IF EXISTS update_cliente_enderecos_updated_at ON cliente_enderecos;
DROP TRIGGER IF EXISTS update_cnpja_configuracoes_updated_at ON cnpja_configuracoes;

CREATE TRIGGER update_cliente_enderecos_updated_at
  BEFORE UPDATE ON cliente_enderecos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cnpja_configuracoes_updated_at
  BEFORE UPDATE ON cnpja_configuracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();