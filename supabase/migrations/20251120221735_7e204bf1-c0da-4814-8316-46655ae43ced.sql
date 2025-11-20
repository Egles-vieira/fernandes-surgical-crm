-- ====================================
-- FASE 3 MELHORADA: Sistema de Fila para Embeddings
-- ====================================

-- 1. Criar tabela de fila de embeddings
CREATE TABLE IF NOT EXISTS public.embeddings_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  erro_mensagem TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Índices para performance
  UNIQUE(produto_id, status) -- Evita duplicatas na fila
);

CREATE INDEX IF NOT EXISTS idx_embeddings_queue_status ON public.embeddings_queue(status);
CREATE INDEX IF NOT EXISTS idx_embeddings_queue_criado ON public.embeddings_queue(criado_em);

-- 2. Trigger para adicionar à fila automaticamente
CREATE OR REPLACE FUNCTION public.enfileirar_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  precisa_atualizar BOOLEAN;
BEGIN
  -- Verificar se precisa gerar embedding
  IF TG_OP = 'INSERT' THEN
    precisa_atualizar := true;
  ELSIF TG_OP = 'UPDATE' THEN
    precisa_atualizar := (
      OLD.referencia_interna IS DISTINCT FROM NEW.referencia_interna OR
      OLD.nome IS DISTINCT FROM NEW.nome OR
      OLD.narrativa IS DISTINCT FROM NEW.narrativa OR
      OLD.marcadores_produto IS DISTINCT FROM NEW.marcadores_produto
    );
  ELSE
    precisa_atualizar := false;
  END IF;

  IF NOT precisa_atualizar THEN
    RETURN NEW;
  END IF;

  -- Adicionar à fila (ou atualizar se já existe)
  INSERT INTO public.embeddings_queue (produto_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (produto_id, status) DO UPDATE
    SET atualizado_em = now(),
        tentativas = 0
  WHERE embeddings_queue.status = 'failed'; -- Só reseta se estava em failed

  RAISE NOTICE 'Produto % adicionado à fila de embeddings', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, apenas loga mas não bloqueia
    RAISE WARNING 'Erro ao enfileirar embedding para produto %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Substituir o trigger antigo
DROP TRIGGER IF EXISTS trigger_gerar_embedding ON public.produtos;

CREATE TRIGGER trigger_enfileirar_embedding
  AFTER INSERT OR UPDATE
  ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.enfileirar_embedding();

-- 4. Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.atualizar_embeddings_queue_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_embeddings_queue_timestamp
  BEFORE UPDATE ON public.embeddings_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_embeddings_queue_timestamp();

-- 5. RLS Policies para embeddings_queue
ALTER TABLE public.embeddings_queue ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
CREATE POLICY "Admin pode ver toda fila"
  ON public.embeddings_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode atualizar status
CREATE POLICY "Admin pode atualizar fila"
  ON public.embeddings_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role pode tudo (para edge functions)
CREATE POLICY "Service role full access"
  ON public.embeddings_queue FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 6. Comentários
COMMENT ON TABLE public.embeddings_queue IS 
  'Fila de processamento de embeddings - mais confiável que HTTP direto do trigger';

COMMENT ON FUNCTION public.enfileirar_embedding() IS 
  'Adiciona produtos à fila quando precisam de embedding atualizado';

COMMENT ON TRIGGER trigger_enfileirar_embedding ON public.produtos IS 
  'Enfileira automaticamente produtos que precisam de embeddings';