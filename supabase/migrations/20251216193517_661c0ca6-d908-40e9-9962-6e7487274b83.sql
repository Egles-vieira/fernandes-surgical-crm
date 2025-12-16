-- =====================================================
-- TRIAGEM INTELIGENTE WHATSAPP COM DEEPSEEK
-- =====================================================

-- 1. Adicionar campos de triagem IA em whatsapp_filas
ALTER TABLE public.whatsapp_filas 
ADD COLUMN IF NOT EXISTS palavras_chave TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS regras_triagem TEXT,
ADD COLUMN IF NOT EXISTS prioridade_triagem INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS tipo_fila VARCHAR(50) DEFAULT 'atendimento';

COMMENT ON COLUMN public.whatsapp_filas.palavras_chave IS 'Palavras-chave que ajudam a IA identificar esta fila';
COMMENT ON COLUMN public.whatsapp_filas.regras_triagem IS 'Regras em texto livre para guiar a IA na classificação';
COMMENT ON COLUMN public.whatsapp_filas.prioridade_triagem IS 'Prioridade da fila (1-100). Menor = mais prioritário';
COMMENT ON COLUMN public.whatsapp_filas.tipo_fila IS 'Tipo da fila: atendimento, vendas, suporte, financeiro, etc';

-- 2. Criar tabela de triagem pendente (job queue)
CREATE TABLE IF NOT EXISTS public.whatsapp_triagem_pendente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.whatsapp_contatos(id),
  conta_id UUID REFERENCES public.whatsapp_contas(id),
  
  -- Controle de timing
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aguardar_ate TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 seconds'),
  processado_em TIMESTAMPTZ,
  
  -- Status do processamento
  status VARCHAR(50) NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'processando', 'concluido', 'erro', 'cancelado')),
  tentativas INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  erro_mensagem TEXT,
  
  -- Fluxo de validação CNPJ
  cnpj_solicitado BOOLEAN DEFAULT false,
  cnpj_solicitado_em TIMESTAMPTZ,
  cnpj_informado VARCHAR(20),
  cnpj_validado BOOLEAN,
  cnpj_validado_em TIMESTAMPTZ,
  
  -- Resultados
  cliente_encontrado_id UUID REFERENCES public.clientes(id),
  vendedor_encontrado_id UUID REFERENCES public.perfis_usuario(id),
  fila_definida_id UUID REFERENCES public.whatsapp_filas(id),
  operador_atribuido_id UUID REFERENCES public.perfis_usuario(id),
  
  -- Resultado completo da triagem
  resultado_triagem JSONB,
  motivo_atribuicao VARCHAR(100),
  
  -- Índices para performance
  CONSTRAINT unique_triagem_conversa UNIQUE (conversa_id)
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_triagem_pendente_status ON public.whatsapp_triagem_pendente(status);
CREATE INDEX IF NOT EXISTS idx_triagem_pendente_aguardar ON public.whatsapp_triagem_pendente(aguardar_ate) WHERE status = 'aguardando';
CREATE INDEX IF NOT EXISTS idx_triagem_pendente_conversa ON public.whatsapp_triagem_pendente(conversa_id);

-- 3. Habilitar RLS
ALTER TABLE public.whatsapp_triagem_pendente ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins e managers podem ver triagens pendentes"
ON public.whatsapp_triagem_pendente FOR SELECT
USING (auth_is_admin() OR auth_is_manager());

CREATE POLICY "Sistema pode gerenciar triagens"
ON public.whatsapp_triagem_pendente FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.atualizar_triagem_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.processado_em = CASE WHEN NEW.status IN ('concluido', 'erro') THEN now() ELSE NEW.processado_em END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_atualizar_triagem_timestamp
BEFORE UPDATE ON public.whatsapp_triagem_pendente
FOR EACH ROW EXECUTE FUNCTION public.atualizar_triagem_timestamp();

-- 5. Função para buscar triagens prontas para processamento
CREATE OR REPLACE FUNCTION public.buscar_triagens_pendentes(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  conversa_id UUID,
  contato_id UUID,
  conta_id UUID,
  cnpj_solicitado BOOLEAN,
  cnpj_informado VARCHAR(20),
  cliente_encontrado_id UUID,
  tentativas INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.whatsapp_triagem_pendente t
  SET status = 'processando', tentativas = t.tentativas + 1
  WHERE t.id IN (
    SELECT sub.id
    FROM public.whatsapp_triagem_pendente sub
    WHERE sub.status = 'aguardando'
      AND sub.aguardar_ate <= now()
      AND sub.tentativas < sub.max_tentativas
    ORDER BY sub.criado_em ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING t.id, t.conversa_id, t.contato_id, t.conta_id, 
            t.cnpj_solicitado, t.cnpj_informado, t.cliente_encontrado_id, t.tentativas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Adicionar coluna triagem_status em whatsapp_conversas
ALTER TABLE public.whatsapp_conversas
ADD COLUMN IF NOT EXISTS triagem_status VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS triagem_motivo TEXT;

COMMENT ON COLUMN public.whatsapp_conversas.triagem_status IS 'Status da triagem: aguardando_cnpj, em_triagem, triagem_concluida';
COMMENT ON COLUMN public.whatsapp_conversas.triagem_motivo IS 'Motivo/justificativa da triagem IA';