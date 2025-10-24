-- =====================================================
-- MÓDULO EDI/PLATAFORMAS - ESTRUTURA MULTI-PLATAFORMA
-- =====================================================

-- 1. TABELA: plataformas_edi
-- Suporta múltiplas plataformas com configurações flexíveis
CREATE TABLE public.plataformas_edi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  tipo_plataforma VARCHAR(50) NOT NULL, -- 'bionexo', 'mercado_eletronico', 'comprasnet', etc
  
  -- Credenciais (flexível por plataforma)
  configuracoes JSONB NOT NULL DEFAULT '{}', -- { usuario, senha, tokens, endpoints, etc }
  
  -- Mapeamento de Campos (cada plataforma tem campos diferentes)
  mapeamento_campos JSONB NOT NULL DEFAULT '{}',
  -- Exemplo: {
  --   "id_cotacao": "idPDC",
  --   "cnpj_cliente": "cnpjHospital",
  --   "data_vencimento": "dataVencimento"
  -- }
  
  -- Configurações de Integração
  ambiente VARCHAR(20) DEFAULT 'homologacao',
  intervalo_consulta_minutos INTEGER DEFAULT 5,
  formato_dados VARCHAR(20) DEFAULT 'xml', -- 'xml', 'json', 'csv'
  ativo BOOLEAN DEFAULT true,
  
  -- Metadados
  ultima_consulta_em TIMESTAMPTZ,
  total_cotacoes_baixadas INTEGER DEFAULT 0,
  total_pedidos_baixados INTEGER DEFAULT 0,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES public.perfis_usuario(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (ambiente IN ('homologacao', 'producao')),
  CHECK (tipo_plataforma IN ('bionexo', 'mercado_eletronico', 'comprasnet', 'bb_compras', 'custom')),
  CHECK (formato_dados IN ('xml', 'json', 'csv', 'soap'))
);

CREATE INDEX idx_plataformas_edi_slug ON public.plataformas_edi(slug);
CREATE INDEX idx_plataformas_edi_ativo ON public.plataformas_edi(ativo);

-- 2. TABELA: edi_produtos_vinculo (DE-PARA)
CREATE TABLE public.edi_produtos_vinculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  plataforma_id UUID REFERENCES public.plataformas_edi(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
  
  -- Identificadores do Cliente
  cnpj_cliente VARCHAR(18) NOT NULL,
  codigo_produto_cliente VARCHAR(100),
  descricao_cliente TEXT,
  
  -- Identificadores Nossos
  codigo_ean VARCHAR(14),
  codigo_simpro VARCHAR(20),
  codigo_produto_fornecedor VARCHAR(100),
  
  -- Sugestão IA
  sugerido_por_ia BOOLEAN DEFAULT false,
  score_confianca NUMERIC(5,2), -- 0-100
  sugerido_em TIMESTAMPTZ,
  prompt_ia TEXT, -- Salvar o prompt usado
  resposta_ia JSONB, -- Salvar resposta completa da IA
  aprovado_por UUID REFERENCES public.perfis_usuario(id),
  aprovado_em TIMESTAMPTZ,
  
  -- Configurações
  eh_produto_alternativo BOOLEAN DEFAULT false,
  ordem_prioridade INTEGER DEFAULT 1,
  
  -- Preços e Estoque
  preco_padrao NUMERIC(15,2),
  desconto_padrao NUMERIC(5,2) DEFAULT 0,
  estoque_minimo NUMERIC(15,3),
  
  -- Histórico
  ultima_cotacao_em TIMESTAMPTZ,
  ultimo_preco_respondido NUMERIC(15,2),
  total_cotacoes_respondidas INTEGER DEFAULT 0,
  total_pedidos_ganhos INTEGER DEFAULT 0,
  total_pedidos_perdidos INTEGER DEFAULT 0,
  taxa_conversao NUMERIC(5,2) DEFAULT 0,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES public.perfis_usuario(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plataforma_id, cnpj_cliente, codigo_produto_cliente, produto_id),
  CHECK (ordem_prioridade > 0),
  CHECK (score_confianca IS NULL OR (score_confianca >= 0 AND score_confianca <= 100))
);

CREATE INDEX idx_edi_vinculo_cnpj ON public.edi_produtos_vinculo(cnpj_cliente);
CREATE INDEX idx_edi_vinculo_codigo ON public.edi_produtos_vinculo(codigo_produto_cliente);
CREATE INDEX idx_edi_vinculo_produto ON public.edi_produtos_vinculo(produto_id);
CREATE INDEX idx_edi_vinculo_plataforma ON public.edi_produtos_vinculo(plataforma_id);
CREATE INDEX idx_edi_vinculo_ia ON public.edi_produtos_vinculo(sugerido_por_ia, aprovado_em);

-- 3. TABELA: edi_cotacoes (com sistema de resgates e steps)
CREATE TABLE public.edi_cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  plataforma_id UUID REFERENCES public.plataformas_edi(id) ON DELETE CASCADE,
  
  -- Identificação (flexível para qualquer plataforma)
  id_cotacao_externa VARCHAR(100) NOT NULL,
  numero_cotacao VARCHAR(100),
  dados_originais JSONB NOT NULL, -- Dados completos da plataforma original
  
  -- Dados do Cliente (extraídos via mapeamento)
  cnpj_cliente VARCHAR(18) NOT NULL,
  nome_cliente TEXT,
  cidade_cliente VARCHAR(100),
  uf_cliente VARCHAR(2),
  
  -- Datas
  data_abertura TIMESTAMPTZ NOT NULL,
  data_vencimento_original TIMESTAMPTZ NOT NULL,
  data_vencimento_atual TIMESTAMPTZ NOT NULL,
  data_encerramento TIMESTAMPTZ,
  
  -- SISTEMA DE STEPS (WORKFLOW)
  step_atual VARCHAR(30) NOT NULL DEFAULT 'nova',
  -- 'nova' -> 'em_analise' -> 'respondida' -> 'confirmada' -> 'perdida' -> 'cancelada'
  
  historico_steps JSONB DEFAULT '[]', 
  -- [{ step: 'nova', timestamp: '...', usuario_id: '...' }]
  
  -- RESGATAR COTAÇÃO
  resgatada BOOLEAN DEFAULT false,
  resgatada_por UUID REFERENCES public.perfis_usuario(id),
  resgatada_em TIMESTAMPTZ,
  
  -- Resposta
  respondido_por UUID REFERENCES public.perfis_usuario(id),
  respondido_em TIMESTAMPTZ,
  id_resposta_externa VARCHAR(50),
  
  -- Detalhes (flexível)
  detalhes JSONB DEFAULT '{}',
  -- { forma_pagamento, prazo_entrega, tipo_frete, observacoes, etc }
  
  -- Métricas
  total_itens INTEGER DEFAULT 0,
  total_itens_respondidos INTEGER DEFAULT 0,
  total_itens_confirmados INTEGER DEFAULT 0,
  valor_total_respondido NUMERIC(15,2) DEFAULT 0,
  valor_total_confirmado NUMERIC(15,2) DEFAULT 0,
  
  -- Auditoria
  baixado_em TIMESTAMPTZ DEFAULT NOW(),
  dados_brutos TEXT, -- XML/JSON original completo
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plataforma_id, id_cotacao_externa),
  CHECK (step_atual IN ('nova', 'em_analise', 'respondida', 'confirmada', 'perdida', 'cancelada'))
);

CREATE INDEX idx_edi_cotacoes_externa ON public.edi_cotacoes(id_cotacao_externa);
CREATE INDEX idx_edi_cotacoes_cnpj ON public.edi_cotacoes(cnpj_cliente);
CREATE INDEX idx_edi_cotacoes_step ON public.edi_cotacoes(step_atual);
CREATE INDEX idx_edi_cotacoes_vencimento ON public.edi_cotacoes(data_vencimento_atual);
CREATE INDEX idx_edi_cotacoes_resgatada ON public.edi_cotacoes(resgatada, resgatada_por);
CREATE INDEX idx_edi_cotacoes_plataforma ON public.edi_cotacoes(plataforma_id);

-- 4. TABELA: edi_cotacoes_itens
CREATE TABLE public.edi_cotacoes_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  cotacao_id UUID REFERENCES public.edi_cotacoes(id) ON DELETE CASCADE,
  produto_vinculo_id UUID REFERENCES public.edi_produtos_vinculo(id),
  produto_id UUID REFERENCES public.produtos(id),
  
  -- Identificação
  id_item_externo VARCHAR(100),
  numero_item INTEGER,
  
  -- Produto do Cliente
  codigo_produto_cliente VARCHAR(100),
  descricao_produto_cliente TEXT NOT NULL,
  unidade_medida VARCHAR(10),
  
  -- Dados originais do item (flexível)
  dados_originais JSONB NOT NULL,
  
  -- Quantidades
  quantidade_solicitada NUMERIC(15,3) NOT NULL,
  quantidade_respondida NUMERIC(15,3),
  quantidade_confirmada NUMERIC(15,3),
  
  -- Preços e Valores
  preco_unitario_respondido NUMERIC(15,2),
  percentual_desconto NUMERIC(5,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  preco_total NUMERIC(15,2),
  
  -- Status
  status VARCHAR(30) DEFAULT 'pendente',
  
  -- Detalhes da Resposta (flexível)
  detalhes_resposta JSONB DEFAULT '{}',
  
  -- Sugestão IA
  produtos_sugeridos_ia JSONB, 
  -- [{ produto_id, score, motivo }]
  
  -- Auditoria
  respondido_em TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (status IN ('pendente', 'respondido', 'confirmado', 'parcialmente_confirmado', 'cancelado', 'perdido'))
);

CREATE INDEX idx_edi_itens_cotacao ON public.edi_cotacoes_itens(cotacao_id);
CREATE INDEX idx_edi_itens_produto ON public.edi_cotacoes_itens(produto_id);
CREATE INDEX idx_edi_itens_status ON public.edi_cotacoes_itens(status);
CREATE INDEX idx_edi_itens_vinculo ON public.edi_cotacoes_itens(produto_vinculo_id);

-- 5. TABELA: edi_pedidos
CREATE TABLE public.edi_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  plataforma_id UUID REFERENCES public.plataformas_edi(id) ON DELETE CASCADE,
  cotacao_id UUID REFERENCES public.edi_cotacoes(id),
  
  -- Identificação
  id_pedido_externo VARCHAR(100) NOT NULL,
  numero_pedido VARCHAR(100),
  dados_originais JSONB NOT NULL,
  
  -- Dados do Cliente
  cnpj_cliente VARCHAR(18) NOT NULL,
  nome_cliente TEXT,
  cidade_cliente VARCHAR(100),
  uf_cliente VARCHAR(2),
  
  -- Datas
  data_pedido TIMESTAMPTZ NOT NULL,
  data_confirmacao TIMESTAMPTZ NOT NULL,
  data_entrega_prevista DATE,
  data_faturamento DATE,
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'confirmado',
  
  -- Valores
  valor_total NUMERIC(15,2) NOT NULL,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_final NUMERIC(15,2) NOT NULL,
  
  -- Detalhes (flexível)
  detalhes JSONB DEFAULT '{}',
  
  -- Controle
  resgatado_em TIMESTAMPTZ DEFAULT NOW(),
  integrado_erp BOOLEAN DEFAULT false,
  integrado_erp_em TIMESTAMPTZ,
  numero_nota_fiscal VARCHAR(50),
  
  -- Auditoria
  dados_brutos TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plataforma_id, id_pedido_externo),
  CHECK (status IN ('confirmado', 'faturado', 'entregue', 'cancelado'))
);

CREATE INDEX idx_edi_pedidos_externo ON public.edi_pedidos(id_pedido_externo);
CREATE INDEX idx_edi_pedidos_cnpj ON public.edi_pedidos(cnpj_cliente);
CREATE INDEX idx_edi_pedidos_status ON public.edi_pedidos(status);
CREATE INDEX idx_edi_pedidos_cotacao ON public.edi_pedidos(cotacao_id);
CREATE INDEX idx_edi_pedidos_plataforma ON public.edi_pedidos(plataforma_id);

-- 6. TABELA: edi_pedidos_itens
CREATE TABLE public.edi_pedidos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  pedido_id UUID REFERENCES public.edi_pedidos(id) ON DELETE CASCADE,
  cotacao_item_id UUID REFERENCES public.edi_cotacoes_itens(id),
  produto_vinculo_id UUID REFERENCES public.edi_produtos_vinculo(id),
  produto_id UUID REFERENCES public.produtos(id),
  
  -- Identificação
  id_item_externo VARCHAR(100),
  numero_item INTEGER,
  
  -- Dados originais
  dados_originais JSONB NOT NULL,
  
  -- Produto
  codigo_produto VARCHAR(100),
  descricao_produto TEXT NOT NULL,
  unidade_medida VARCHAR(10),
  
  -- Quantidades
  quantidade NUMERIC(15,3) NOT NULL,
  quantidade_entregue NUMERIC(15,3) DEFAULT 0,
  
  -- Preços
  preco_unitario NUMERIC(15,2) NOT NULL,
  percentual_desconto NUMERIC(5,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL,
  
  -- Detalhes (flexível)
  detalhes JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(30) DEFAULT 'pendente',
  
  -- Cancelamento
  foi_cancelado BOOLEAN DEFAULT false,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (status IN ('pendente', 'faturado', 'entregue', 'cancelado'))
);

CREATE INDEX idx_edi_pedidos_itens_pedido ON public.edi_pedidos_itens(pedido_id);
CREATE INDEX idx_edi_pedidos_itens_produto ON public.edi_pedidos_itens(produto_id);
CREATE INDEX idx_edi_pedidos_itens_cotacao ON public.edi_pedidos_itens(cotacao_item_id);

-- 7. TABELA: edi_logs_integracao (RASTREABILIDADE COMPLETA)
CREATE TABLE public.edi_logs_integracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  plataforma_id UUID REFERENCES public.plataformas_edi(id),
  
  -- Operação
  operacao VARCHAR(50) NOT NULL, -- Flexível para qualquer plataforma
  tipo VARCHAR(20) NOT NULL, -- 'request' | 'response' | 'error'
  metodo VARCHAR(10), -- 'GET', 'POST', 'SOAP', etc
  
  -- Dados
  parametros JSONB,
  payload_enviado TEXT,
  payload_recebido TEXT,
  
  -- Resultado
  status_code INTEGER,
  status_http INTEGER,
  mensagem_retorno TEXT,
  sucesso BOOLEAN,
  
  -- Referências
  id_cotacao_externa VARCHAR(100),
  id_pedido_externo VARCHAR(100),
  entidade_tipo VARCHAR(20), -- 'cotacao', 'pedido', 'produto', 'vinculo'
  entidade_id UUID,
  
  -- Timing
  tempo_execucao_ms INTEGER,
  executado_em TIMESTAMPTZ DEFAULT NOW(),
  executado_por UUID REFERENCES public.perfis_usuario(id),
  
  -- Error Tracking
  erro TEXT,
  stack_trace TEXT,
  dados_debug JSONB,
  
  CHECK (tipo IN ('request', 'response', 'error', 'webhook', 'cron')),
  CHECK (entidade_tipo IS NULL OR entidade_tipo IN ('cotacao', 'pedido', 'produto', 'vinculo', 'resposta'))
);

CREATE INDEX idx_edi_logs_operacao ON public.edi_logs_integracao(operacao);
CREATE INDEX idx_edi_logs_executado ON public.edi_logs_integracao(executado_em DESC);
CREATE INDEX idx_edi_logs_sucesso ON public.edi_logs_integracao(sucesso);
CREATE INDEX idx_edi_logs_plataforma ON public.edi_logs_integracao(plataforma_id);
CREATE INDEX idx_edi_logs_entidade ON public.edi_logs_integracao(entidade_tipo, entidade_id);
CREATE INDEX idx_edi_logs_cotacao ON public.edi_logs_integracao(id_cotacao_externa);

-- 8. TABELA: edi_historico_mudancas
CREATE TABLE public.edi_historico_mudancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências polimórficas
  entidade_tipo VARCHAR(20) NOT NULL,
  entidade_id UUID NOT NULL,
  
  -- Mudança
  campo VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  
  -- Contexto
  motivo TEXT,
  detalhes JSONB,
  
  -- Auditoria
  alterado_em TIMESTAMPTZ DEFAULT NOW(),
  alterado_por UUID REFERENCES public.perfis_usuario(id),
  
  CHECK (entidade_tipo IN ('cotacao', 'pedido', 'item', 'vinculo', 'plataforma'))
);

CREATE INDEX idx_edi_historico_entidade ON public.edi_historico_mudancas(entidade_tipo, entidade_id);
CREATE INDEX idx_edi_historico_campo ON public.edi_historico_mudancas(campo);
CREATE INDEX idx_edi_historico_alterado ON public.edi_historico_mudancas(alterado_em DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at_edi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_plataformas_edi_updated
  BEFORE UPDATE ON public.plataformas_edi
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at_edi();

CREATE TRIGGER trg_edi_vinculo_updated
  BEFORE UPDATE ON public.edi_produtos_vinculo
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at_edi();

CREATE TRIGGER trg_edi_cotacoes_updated
  BEFORE UPDATE ON public.edi_cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at_edi();

CREATE TRIGGER trg_edi_cotacoes_itens_updated
  BEFORE UPDATE ON public.edi_cotacoes_itens
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at_edi();

CREATE TRIGGER trg_edi_pedidos_updated
  BEFORE UPDATE ON public.edi_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at_edi();

CREATE TRIGGER trg_edi_pedidos_itens_updated
  BEFORE UPDATE ON public.edi_pedidos_itens
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at_edi();

-- Trigger para registrar mudanças de step
CREATE OR REPLACE FUNCTION public.registrar_mudanca_step_cotacao()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.step_atual IS DISTINCT FROM NEW.step_atual THEN
    -- Adicionar ao histórico de steps
    NEW.historico_steps = COALESCE(NEW.historico_steps, '[]'::jsonb) || 
      jsonb_build_object(
        'step', NEW.step_atual,
        'timestamp', NOW(),
        'usuario_id', auth.uid()
      );
    
    -- Registrar na tabela de histórico
    INSERT INTO public.edi_historico_mudancas (
      entidade_tipo,
      entidade_id,
      campo,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      'cotacao',
      NEW.id,
      'step_atual',
      OLD.step_atual,
      NEW.step_atual,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cotacao_step_mudanca
  BEFORE UPDATE ON public.edi_cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.registrar_mudanca_step_cotacao();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.plataformas_edi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_produtos_vinculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_cotacoes_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_pedidos_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_logs_integracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_historico_mudancas ENABLE ROW LEVEL SECURITY;

-- Policies para plataformas_edi
CREATE POLICY "Admins e Managers podem gerenciar plataformas"
  ON public.plataformas_edi
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales podem visualizar plataformas ativas"
  ON public.plataformas_edi
  FOR SELECT
  USING (has_role(auth.uid(), 'sales'::app_role) AND ativo = true);

-- Policies para edi_produtos_vinculo
CREATE POLICY "Usuários podem gerenciar vínculos"
  ON public.edi_produtos_vinculo
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

-- Policies para edi_cotacoes
CREATE POLICY "Usuários podem visualizar cotações"
  ON public.edi_cotacoes
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role]));

CREATE POLICY "Usuários podem atualizar cotações resgatadas"
  ON public.edi_cotacoes
  FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) 
    OR resgatada_por = auth.uid()
  );

CREATE POLICY "Sistema pode inserir cotações"
  ON public.edi_cotacoes
  FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policies para edi_cotacoes_itens
CREATE POLICY "Usuários podem gerenciar itens de cotação"
  ON public.edi_cotacoes_itens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.edi_cotacoes
      WHERE edi_cotacoes.id = edi_cotacoes_itens.cotacao_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
        OR edi_cotacoes.resgatada_por = auth.uid()
      )
    )
  );

-- Policies para edi_pedidos
CREATE POLICY "Usuários podem visualizar pedidos"
  ON public.edi_pedidos
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role, 'warehouse'::app_role]));

CREATE POLICY "Sistema pode gerenciar pedidos"
  ON public.edi_pedidos
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policies para edi_pedidos_itens
CREATE POLICY "Usuários podem visualizar itens de pedido"
  ON public.edi_pedidos_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.edi_pedidos
      WHERE edi_pedidos.id = edi_pedidos_itens.pedido_id
    )
    AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role, 'warehouse'::app_role])
  );

CREATE POLICY "Admins podem gerenciar itens de pedido"
  ON public.edi_pedidos_itens
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policies para edi_logs_integracao
CREATE POLICY "Admins podem gerenciar logs"
  ON public.edi_logs_integracao
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem visualizar logs"
  ON public.edi_logs_integracao
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policies para edi_historico_mudancas
CREATE POLICY "Usuários podem visualizar histórico"
  ON public.edi_historico_mudancas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode inserir histórico"
  ON public.edi_historico_mudancas
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);