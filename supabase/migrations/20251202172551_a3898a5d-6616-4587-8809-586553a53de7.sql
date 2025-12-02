-- =============================================
-- SMART PROPOSAL - Schema Completo
-- =============================================

-- 1. Tabela de Tokens Públicos
CREATE TABLE public.propostas_publicas_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  public_token VARCHAR(64) UNIQUE NOT NULL,
  
  -- Controle de acesso
  ativo BOOLEAN DEFAULT true,
  expira_em TIMESTAMPTZ,
  senha_hash TEXT,
  
  -- Configurações de exibição
  mostrar_precos BOOLEAN DEFAULT true,
  mostrar_descontos BOOLEAN DEFAULT true,
  permitir_aceitar BOOLEAN DEFAULT true,
  permitir_recusar BOOLEAN DEFAULT true,
  permitir_download_pdf BOOLEAN DEFAULT true,
  mensagem_personalizada TEXT,
  
  -- Metadata
  criado_por UUID REFERENCES perfis_usuario(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_propostas_tokens_token ON propostas_publicas_tokens(public_token);
CREATE INDEX idx_propostas_tokens_venda ON propostas_publicas_tokens(venda_id);

-- 2. Tabela de Analytics (Sessões)
CREATE TABLE public.propostas_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_token_id UUID NOT NULL REFERENCES propostas_publicas_tokens(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  
  session_id VARCHAR(64) NOT NULL,
  
  -- Device Info
  device_type VARCHAR(20),
  os_name VARCHAR(50),
  os_version VARCHAR(20),
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),
  screen_width INT,
  screen_height INT,
  
  -- Geolocalização
  ip_hash VARCHAR(64),
  cidade VARCHAR(100),
  estado VARCHAR(50),
  pais VARCHAR(50),
  
  -- Métricas
  tempo_total_segundos INT DEFAULT 0,
  scroll_max_percent INT DEFAULT 0,
  
  -- Timestamps
  iniciado_em TIMESTAMPTZ DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  ultima_atividade_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_token ON propostas_analytics(proposta_token_id);
CREATE INDEX idx_analytics_venda ON propostas_analytics(venda_id);
CREATE INDEX idx_analytics_session ON propostas_analytics(session_id);

-- 3. Tabela de Tempo por Seção
CREATE TABLE public.propostas_analytics_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_id UUID NOT NULL REFERENCES propostas_analytics(id) ON DELETE CASCADE,
  
  secao_id VARCHAR(50) NOT NULL,
  secao_nome VARCHAR(100),
  
  tempo_visivel_segundos INT DEFAULT 0,
  vezes_visualizada INT DEFAULT 1,
  
  primeira_visualizacao_em TIMESTAMPTZ DEFAULT now(),
  ultima_visualizacao_em TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(analytics_id, secao_id)
);

CREATE INDEX idx_secoes_analytics ON propostas_analytics_secoes(analytics_id);

-- 4. Tabela de Cliques/Ações
CREATE TABLE public.propostas_analytics_cliques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_id UUID NOT NULL REFERENCES propostas_analytics(id) ON DELETE CASCADE,
  
  tipo_acao VARCHAR(50) NOT NULL,
  elemento_id VARCHAR(100),
  elemento_texto VARCHAR(255),
  
  secao_atual VARCHAR(50),
  scroll_position INT,
  
  clicado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cliques_analytics ON propostas_analytics_cliques(analytics_id);

-- 5. Tabela de Respostas (Aceitar/Recusar)
CREATE TABLE public.propostas_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_token_id UUID NOT NULL REFERENCES propostas_publicas_tokens(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  analytics_id UUID REFERENCES propostas_analytics(id),
  
  tipo_resposta VARCHAR(20) NOT NULL CHECK (tipo_resposta IN ('aceita', 'recusada', 'negociacao')),
  
  nome_respondente VARCHAR(255),
  email_respondente VARCHAR(255),
  cargo_respondente VARCHAR(100),
  telefone_respondente VARCHAR(20),
  
  comentario TEXT,
  motivo_recusa TEXT,
  
  ip_assinatura VARCHAR(45),
  user_agent_assinatura TEXT,
  
  respondido_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_respostas_token ON propostas_respostas(proposta_token_id);
CREATE INDEX idx_respostas_venda ON propostas_respostas(venda_id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE propostas_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE propostas_analytics_secoes;
ALTER PUBLICATION supabase_realtime ADD TABLE propostas_analytics_cliques;
ALTER PUBLICATION supabase_realtime ADD TABLE propostas_respostas;

-- RLS Policies
ALTER TABLE propostas_publicas_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_analytics_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_analytics_cliques ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas para tokens (vendedores podem ver suas propostas)
CREATE POLICY "Vendedores podem ver tokens de suas vendas"
ON propostas_publicas_tokens FOR SELECT
USING (
  venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Vendedores podem criar tokens"
ON propostas_publicas_tokens FOR INSERT
WITH CHECK (
  venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Vendedores podem atualizar seus tokens"
ON propostas_publicas_tokens FOR UPDATE
USING (
  venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Políticas para analytics (acesso público para INSERT via service role, SELECT para vendedores)
CREATE POLICY "Service pode inserir analytics"
ON propostas_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Vendedores podem ver analytics de suas propostas"
ON propostas_analytics FOR SELECT
USING (
  venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Service pode atualizar analytics"
ON propostas_analytics FOR UPDATE
USING (true);

-- Políticas para seções
CREATE POLICY "Service pode inserir secoes"
ON propostas_analytics_secoes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Vendedores podem ver secoes"
ON propostas_analytics_secoes FOR SELECT
USING (
  analytics_id IN (
    SELECT id FROM propostas_analytics 
    WHERE venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  )
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Service pode atualizar secoes"
ON propostas_analytics_secoes FOR UPDATE
USING (true);

-- Políticas para cliques
CREATE POLICY "Service pode inserir cliques"
ON propostas_analytics_cliques FOR INSERT
WITH CHECK (true);

CREATE POLICY "Vendedores podem ver cliques"
ON propostas_analytics_cliques FOR SELECT
USING (
  analytics_id IN (
    SELECT id FROM propostas_analytics 
    WHERE venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  )
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Políticas para respostas
CREATE POLICY "Service pode inserir respostas"
ON propostas_respostas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Vendedores podem ver respostas"
ON propostas_respostas FOR SELECT
USING (
  venda_id IN (SELECT id FROM vendas WHERE vendedor_id = auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Função para gerar token único
CREATE OR REPLACE FUNCTION public.gerar_token_proposta()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_token TEXT;
BEGIN
  novo_token := encode(gen_random_bytes(32), 'hex');
  RETURN novo_token;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_propostas_tokens_updated_at
  BEFORE UPDATE ON propostas_publicas_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();