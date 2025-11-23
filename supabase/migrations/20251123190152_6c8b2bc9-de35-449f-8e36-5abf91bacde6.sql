-- ========================================
-- FASE 1: AGENTE DE VENDAS WHATSAPP V2
-- Estrutura completa de banco de dados
-- ========================================

-- ============================================================
-- 1. TABELA: whatsapp_conversas_memoria
-- Armazena memória semântica de conversas para contexto
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_conversas_memoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  mensagem_id UUID REFERENCES whatsapp_mensagens(id) ON DELETE SET NULL,
  tipo_interacao VARCHAR(50) NOT NULL, -- 'busca_produto', 'negociacao', 'confirmacao', 'duvida'
  conteudo_resumido TEXT NOT NULL,
  produtos_mencionados UUID[] DEFAULT '{}',
  intencao_detectada VARCHAR(100),
  sentimento VARCHAR(20), -- 'positivo', 'negativo', 'neutro'
  embedding VECTOR(1536),
  relevancia_score FLOAT DEFAULT 1.0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_conversas_memoria_conversa ON whatsapp_conversas_memoria(conversa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_memoria_embedding ON whatsapp_conversas_memoria USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_conversas_memoria_tipo ON whatsapp_conversas_memoria(tipo_interacao);
CREATE INDEX IF NOT EXISTS idx_conversas_memoria_expira ON whatsapp_conversas_memoria(expira_em);

ALTER TABLE whatsapp_conversas_memoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver memória de suas conversas"
  ON whatsapp_conversas_memoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversas wc
      WHERE wc.id = whatsapp_conversas_memoria.conversa_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
        OR wc.atribuida_para_id = auth.uid()
      )
    )
  );

CREATE POLICY "Sistema pode inserir memória"
  ON whatsapp_conversas_memoria FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE whatsapp_conversas_memoria IS 'Memória semântica de conversas WhatsApp para contexto de longo prazo';

-- ============================================================
-- 2. TABELA: whatsapp_propostas_comerciais
-- Propostas comerciais geradas pelo agente
-- ============================================================
CREATE TYPE status_proposta AS ENUM (
  'rascunho', 
  'enviada', 
  'aceita', 
  'rejeitada', 
  'negociacao', 
  'aprovacao_pendente', 
  'aprovada_diretoria', 
  'rejeitada_diretoria'
);

CREATE TABLE IF NOT EXISTS whatsapp_propostas_comerciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  oportunidade_id UUID REFERENCES oportunidades(id) ON DELETE SET NULL,
  mensagem_proposta_id UUID REFERENCES whatsapp_mensagens(id) ON DELETE SET NULL,
  
  numero_proposta VARCHAR(50) UNIQUE NOT NULL,
  status status_proposta DEFAULT 'rascunho',
  
  -- Valores
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(12,2) DEFAULT 0,
  valor_frete NUMERIC(12,2) DEFAULT 0,
  impostos_percentual NUMERIC(5,2) DEFAULT 0,
  impostos_valor NUMERIC(12,2) DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL,
  
  -- Metadata
  observacoes TEXT,
  condicao_pagamento VARCHAR(100),
  prazo_entrega_dias INTEGER,
  validade_dias INTEGER DEFAULT 7,
  
  -- Negociação
  total_contraproposta NUMERIC(12,2),
  mensagem_negociacao TEXT,
  
  -- Aprovação
  requer_aprovacao_diretoria BOOLEAN DEFAULT FALSE,
  aprovada_por_diretoria_em TIMESTAMPTZ,
  aprovada_por_id UUID REFERENCES perfis_usuario(id),
  motivo_rejeicao_diretoria TEXT,
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  enviado_em TIMESTAMPTZ,
  aceito_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence para número da proposta
CREATE SEQUENCE IF NOT EXISTS whatsapp_proposta_numero_seq START 1;

-- Trigger para gerar número sequencial
CREATE OR REPLACE FUNCTION gerar_numero_proposta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_proposta IS NULL THEN
    NEW.numero_proposta := 'PROP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('whatsapp_proposta_numero_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gerar_numero_proposta ON whatsapp_propostas_comerciais;
CREATE TRIGGER trigger_gerar_numero_proposta
  BEFORE INSERT ON whatsapp_propostas_comerciais
  FOR EACH ROW
  EXECUTE FUNCTION gerar_numero_proposta();

-- Índices
CREATE INDEX IF NOT EXISTS idx_propostas_conversa ON whatsapp_propostas_comerciais(conversa_id);
CREATE INDEX IF NOT EXISTS idx_propostas_oportunidade ON whatsapp_propostas_comerciais(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON whatsapp_propostas_comerciais(status);
CREATE INDEX IF NOT EXISTS idx_propostas_numero ON whatsapp_propostas_comerciais(numero_proposta);

-- RLS
ALTER TABLE whatsapp_propostas_comerciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar propostas de suas conversas"
  ON whatsapp_propostas_comerciais FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversas wc
      WHERE wc.id = whatsapp_propostas_comerciais.conversa_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
        OR wc.atribuida_para_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE whatsapp_propostas_comerciais IS 'Propostas comerciais geradas pelo agente de vendas WhatsApp';

-- ============================================================
-- 3. TABELA: whatsapp_propostas_itens
-- Itens/linhas das propostas comerciais
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_propostas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES whatsapp_propostas_comerciais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  
  referencia_interna VARCHAR(50),
  nome_produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL,
  
  ordem INTEGER DEFAULT 0,
  observacoes TEXT,
  
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propostas_itens_proposta ON whatsapp_propostas_itens(proposta_id);
CREATE INDEX IF NOT EXISTS idx_propostas_itens_produto ON whatsapp_propostas_itens(produto_id);

-- RLS (herda da proposta)
ALTER TABLE whatsapp_propostas_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar itens de suas propostas"
  ON whatsapp_propostas_itens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_propostas_comerciais wp
      JOIN whatsapp_conversas wc ON wc.id = wp.conversa_id
      WHERE wp.id = whatsapp_propostas_itens.proposta_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
        OR wc.atribuida_para_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE whatsapp_propostas_itens IS 'Itens/linhas das propostas comerciais';

-- ============================================================
-- 4. TABELA: whatsapp_interacoes
-- Log detalhado de todas interações do agente
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  mensagem_id UUID REFERENCES whatsapp_mensagens(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES whatsapp_propostas_comerciais(id) ON DELETE SET NULL,
  
  tipo_evento VARCHAR(100) NOT NULL, -- 'proposta_criada', 'proposta_enviada', 'produto_adicionado', etc
  descricao TEXT,
  metadata JSONB DEFAULT '{}',
  
  executado_por_id UUID REFERENCES perfis_usuario(id),
  executado_por_bot BOOLEAN DEFAULT FALSE,
  
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_conversa ON whatsapp_interacoes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_proposta ON whatsapp_interacoes(proposta_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_tipo ON whatsapp_interacoes(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_interacoes_criado ON whatsapp_interacoes(criado_em DESC);

-- RLS
ALTER TABLE whatsapp_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver interacoes de suas conversas"
  ON whatsapp_interacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversas wc
      WHERE wc.id = whatsapp_interacoes.conversa_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
        OR wc.atribuida_para_id = auth.uid()
      )
    )
  );

CREATE POLICY "Sistema pode inserir interacoes"
  ON whatsapp_interacoes FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE whatsapp_interacoes IS 'Log detalhado de interações do agente de vendas';

-- ============================================================
-- 5. TABELA: whatsapp_feedback_produtos
-- Feedback de clientes sobre produtos para ML
-- ============================================================
CREATE TYPE tipo_feedback AS ENUM ('positivo', 'negativo', 'neutro');

CREATE TABLE IF NOT EXISTS whatsapp_feedback_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES whatsapp_propostas_comerciais(id) ON DELETE SET NULL,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  tipo tipo_feedback NOT NULL,
  query_busca TEXT, -- Termo que o cliente buscou
  foi_sugerido BOOLEAN DEFAULT FALSE,
  foi_comprado BOOLEAN DEFAULT FALSE,
  
  motivo_rejeicao TEXT,
  comentario_cliente TEXT,
  
  score_ajuste NUMERIC(5,2) DEFAULT 0, -- +0.1 / -0.1 por feedback
  
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_produto ON whatsapp_feedback_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_feedback_conversa ON whatsapp_feedback_produtos(conversa_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tipo ON whatsapp_feedback_produtos(tipo);

-- RLS
ALTER TABLE whatsapp_feedback_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e managers podem ver feedbacks"
  ON whatsapp_feedback_produtos FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sistema pode inserir feedbacks"
  ON whatsapp_feedback_produtos FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE whatsapp_feedback_produtos IS 'Feedback de clientes sobre produtos para machine learning';

-- ============================================================
-- 6. TABELA: whatsapp_aprovacoes_diretoria
-- Workflow de aprovação de propostas pela diretoria
-- ============================================================
CREATE TYPE status_aprovacao AS ENUM ('pendente', 'aprovada', 'rejeitada', 'expirada');

CREATE TABLE IF NOT EXISTS whatsapp_aprovacoes_diretoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES whatsapp_propostas_comerciais(id) ON DELETE CASCADE,
  
  valor_proposta NUMERIC(12,2) NOT NULL,
  motivo_aprovacao TEXT,
  
  status status_aprovacao DEFAULT 'pendente',
  
  solicitado_por_id UUID REFERENCES perfis_usuario(id),
  solicitado_em TIMESTAMPTZ DEFAULT NOW(),
  
  aprovado_por_id UUID REFERENCES perfis_usuario(id),
  aprovado_em TIMESTAMPTZ,
  
  motivo_decisao TEXT,
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aprovacoes_proposta ON whatsapp_aprovacoes_diretoria(proposta_id);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_status ON whatsapp_aprovacoes_diretoria(status);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_solicitado ON whatsapp_aprovacoes_diretoria(solicitado_por_id);

-- RLS
ALTER TABLE whatsapp_aprovacoes_diretoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diretores podem ver todas aprovações"
  ON whatsapp_aprovacoes_diretoria FOR SELECT
  USING (has_role(auth.uid(), 'diretor_comercial'));

CREATE POLICY "Vendedores podem ver suas solicitações"
  ON whatsapp_aprovacoes_diretoria FOR SELECT
  USING (solicitado_por_id = auth.uid());

CREATE POLICY "Sistema pode criar solicitações"
  ON whatsapp_aprovacoes_diretoria FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Diretores podem aprovar/rejeitar"
  ON whatsapp_aprovacoes_diretoria FOR UPDATE
  USING (has_role(auth.uid(), 'diretor_comercial'));

COMMENT ON TABLE whatsapp_aprovacoes_diretoria IS 'Workflow de aprovação de propostas comerciais';

-- ============================================================
-- 7. TABELA: produtos_score_ajuste
-- Score de ML para produtos baseado em feedbacks
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos_score_ajuste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  score_ml NUMERIC(5,2) DEFAULT 0, -- Ajuste acumulado de ML
  total_feedbacks_positivos INTEGER DEFAULT 0,
  total_feedbacks_negativos INTEGER DEFAULT 0,
  total_vezes_sugerido INTEGER DEFAULT 0,
  total_vezes_comprado INTEGER DEFAULT 0,
  
  taxa_conversao NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_vezes_sugerido > 0 
      THEN (total_vezes_comprado::NUMERIC / total_vezes_sugerido) * 100 
      ELSE 0 
    END
  ) STORED,
  
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_score_produto ON produtos_score_ajuste(produto_id);

-- RLS
ALTER TABLE produtos_score_ajuste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver scores ML"
  ON produtos_score_ajuste FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode atualizar scores"
  ON produtos_score_ajuste FOR ALL
  USING (true);

COMMENT ON TABLE produtos_score_ajuste IS 'Ajustes de score ML baseado em feedback de clientes';

-- ============================================================
-- 8. TABELA: whatsapp_metricas_agente
-- Métricas agregadas diárias do agente
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_metricas_agente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  whatsapp_conta_id UUID REFERENCES whatsapp_contas(id) ON DELETE CASCADE,
  
  -- Conversas
  total_conversas_iniciadas INTEGER DEFAULT 0,
  total_conversas_fechadas INTEGER DEFAULT 0,
  
  -- Mensagens
  total_mensagens_enviadas_bot INTEGER DEFAULT 0,
  total_mensagens_recebidas INTEGER DEFAULT 0,
  
  -- Propostas
  total_propostas_geradas INTEGER DEFAULT 0,
  total_propostas_aceitas INTEGER DEFAULT 0,
  total_propostas_rejeitadas INTEGER DEFAULT 0,
  
  -- Performance
  tempo_medio_resposta_segundos NUMERIC(10,2) DEFAULT 0,
  taxa_conversao_proposta NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_propostas_geradas > 0 
      THEN (total_propostas_aceitas::NUMERIC / total_propostas_geradas) * 100 
      ELSE 0 
    END
  ) STORED,
  
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_metricas_data_conta ON whatsapp_metricas_agente(data, whatsapp_conta_id);

-- RLS
ALTER TABLE whatsapp_metricas_agente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e managers podem ver métricas"
  ON whatsapp_metricas_agente FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sistema pode inserir métricas"
  ON whatsapp_metricas_agente FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE whatsapp_metricas_agente IS 'Métricas diárias do agente de vendas WhatsApp';

-- ============================================================
-- 9. MODIFICAR: whatsapp_conversas
-- Adicionar campos para controle de fluxo do agente
-- ============================================================
ALTER TABLE whatsapp_conversas 
  ADD COLUMN IF NOT EXISTS estagio_agente VARCHAR(50) DEFAULT 'inicial',
  ADD COLUMN IF NOT EXISTS produtos_carrinho UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proposta_ativa_id UUID REFERENCES whatsapp_propostas_comerciais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ultima_intencao_detectada VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_conversas_estagio ON whatsapp_conversas(estagio_agente);

COMMENT ON COLUMN whatsapp_conversas.estagio_agente IS 'Estágio do fluxo: inicial, buscando_produto, confirmando_itens, negociacao, aguardando_aprovacao, fechamento';
COMMENT ON COLUMN whatsapp_conversas.produtos_carrinho IS 'Array de IDs de produtos que o cliente demonstrou interesse';
COMMENT ON COLUMN whatsapp_conversas.proposta_ativa_id IS 'ID da proposta comercial ativa para esta conversa';
COMMENT ON COLUMN whatsapp_conversas.ultima_intencao_detectada IS 'Última intenção classificada pelo agente';

-- ============================================================
-- 10. FUNÇÃO RPC: recuperar_contexto_relevante
-- Busca contexto semântico usando embeddings
-- ============================================================
CREATE OR REPLACE FUNCTION recuperar_contexto_relevante(
  p_conversa_id UUID,
  p_query_embedding VECTOR(1536),
  p_limite INTEGER DEFAULT 5
)
RETURNS TABLE (
  memoria_id UUID,
  tipo_interacao VARCHAR(50),
  conteudo TEXT,
  produtos UUID[],
  relevancia FLOAT,
  criado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wcm.id,
    wcm.tipo_interacao,
    wcm.conteudo_resumido,
    wcm.produtos_mencionados,
    (1 - (wcm.embedding <=> p_query_embedding))::FLOAT as relevancia,
    wcm.criado_em
  FROM whatsapp_conversas_memoria wcm
  WHERE wcm.conversa_id = p_conversa_id
    AND wcm.expira_em > NOW()
    AND wcm.embedding IS NOT NULL
  ORDER BY wcm.embedding <=> p_query_embedding
  LIMIT p_limite;
END;
$$;

COMMENT ON FUNCTION recuperar_contexto_relevante IS 'Recupera contexto relevante de uma conversa usando busca semântica por embeddings';

-- ============================================================
-- FIM DA MIGRATION - FASE 1 COMPLETA
-- ============================================================