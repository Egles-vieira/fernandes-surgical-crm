-- =====================================================
-- SPRINT 1: INFRAESTRUTURA DATABASE - AGENTE VENDAS V4
-- Tabelas para sessões e logs do agente WhatsApp
-- =====================================================

-- 1. Tabela de sessões do agente
CREATE TABLE public.whatsapp_agente_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  
  -- Estado da sessão
  estado_atual TEXT DEFAULT 'coleta' CHECK (estado_atual IN ('coleta', 'identificacao', 'criacao', 'calculo', 'fechamento')),
  
  -- Dados acumulados
  cliente_identificado_id UUID REFERENCES public.clientes(id),
  oportunidade_spot_id UUID REFERENCES public.oportunidades(id),
  carrinho_itens JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Metadados
  total_mensagens INTEGER DEFAULT 0,
  total_tools_executadas INTEGER DEFAULT 0
);

-- Índices para performance (sem partial index com NOW())
CREATE INDEX idx_agente_sessoes_conversa ON public.whatsapp_agente_sessoes(conversa_id);
CREATE INDEX idx_agente_sessoes_expira ON public.whatsapp_agente_sessoes(expira_em);
CREATE INDEX idx_agente_sessoes_oportunidade ON public.whatsapp_agente_sessoes(oportunidade_spot_id) WHERE oportunidade_spot_id IS NOT NULL;

-- 2. Tabela de logs do agente
CREATE TABLE public.whatsapp_agente_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID REFERENCES public.whatsapp_agente_sessoes(id) ON DELETE SET NULL,
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'mensagem_recebida', 
    'tool_executada', 
    'resposta_gerada', 
    'erro_llm',
    'fallback_ativado',
    'sessao_criada',
    'sessao_expirada',
    'oportunidade_criada',
    'calculo_datasul',
    'link_proposta_gerado'
  )),
  
  -- Dados do evento
  tool_name TEXT,
  tool_args JSONB,
  tool_resultado JSONB,
  
  -- Métricas de performance
  tempo_execucao_ms INTEGER,
  tokens_entrada INTEGER,
  tokens_saida INTEGER,
  
  -- Erro (se houver)
  erro_mensagem TEXT,
  erro_stack TEXT,
  
  -- Provider usado
  llm_provider TEXT CHECK (llm_provider IN ('deepseek', 'lovable_ai', 'openai')),
  
  -- Timestamps
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance e consultas
CREATE INDEX idx_agente_logs_conversa ON public.whatsapp_agente_logs(conversa_id);
CREATE INDEX idx_agente_logs_sessao ON public.whatsapp_agente_logs(sessao_id) WHERE sessao_id IS NOT NULL;
CREATE INDEX idx_agente_logs_tipo ON public.whatsapp_agente_logs(tipo_evento);
CREATE INDEX idx_agente_logs_criado ON public.whatsapp_agente_logs(criado_em DESC);
CREATE INDEX idx_agente_logs_tool ON public.whatsapp_agente_logs(tool_name) WHERE tool_name IS NOT NULL;

-- 3. Adicionar campo oportunidade_spot_id em whatsapp_conversas
ALTER TABLE public.whatsapp_conversas 
ADD COLUMN IF NOT EXISTS oportunidade_spot_id UUID REFERENCES public.oportunidades(id);

CREATE INDEX idx_conversas_oportunidade_spot ON public.whatsapp_conversas(oportunidade_spot_id) WHERE oportunidade_spot_id IS NOT NULL;

-- 4. RLS para as novas tabelas
ALTER TABLE public.whatsapp_agente_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_agente_logs ENABLE ROW LEVEL SECURITY;

-- Policies para sessões (service role full access)
CREATE POLICY "Service role full access sessoes" ON public.whatsapp_agente_sessoes
  FOR ALL USING (true) WITH CHECK (true);

-- Policies para logs (service role full access)  
CREATE POLICY "Service role full access logs" ON public.whatsapp_agente_logs
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION public.update_agente_sessao_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  -- Estender expiração a cada update
  NEW.expira_em = NOW() + INTERVAL '30 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_whatsapp_agente_sessoes_timestamp
  BEFORE UPDATE ON public.whatsapp_agente_sessoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agente_sessao_timestamp();

-- 6. Habilitar realtime para sessões (filtrado por conversa_id)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_agente_sessoes;