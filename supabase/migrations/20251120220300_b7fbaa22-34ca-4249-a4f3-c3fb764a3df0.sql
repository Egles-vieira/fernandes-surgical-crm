-- ====================================
-- FASE 3: Trigger Automático para Embeddings
-- ====================================

-- 1. Habilitar extensão pg_net (para fazer HTTP requests do banco)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar função que será chamada pelo trigger
CREATE OR REPLACE FUNCTION public.gerar_embedding_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  function_url text;
  precisa_atualizar boolean;
BEGIN
  -- Verificar se precisa gerar embedding
  IF TG_OP = 'INSERT' THEN
    -- Sempre gera embedding para produtos novos
    precisa_atualizar := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Para updates, só gera se campos relevantes mudaram
    precisa_atualizar := (
      OLD.referencia_interna IS DISTINCT FROM NEW.referencia_interna OR
      OLD.nome IS DISTINCT FROM NEW.nome OR
      OLD.narrativa IS DISTINCT FROM NEW.narrativa OR
      OLD.marcadores_produto IS DISTINCT FROM NEW.marcadores_produto
    );
  ELSE
    precisa_atualizar := false;
  END IF;

  -- Se não precisa atualizar, retorna sem fazer nada
  IF NOT precisa_atualizar THEN
    RETURN NEW;
  END IF;

  -- URL da edge function
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/gerar-embedding-produto';
  
  -- Fazer requisição assíncrona para a edge function
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    ),
    body := jsonb_build_object('produto_id', NEW.id)
  ) INTO request_id;
  
  -- Log da requisição
  RAISE NOTICE 'Embedding requisitado para produto % (request_id: %)', NEW.id, request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, apenas loga mas não bloqueia a operação
    RAISE WARNING 'Erro ao solicitar embedding para produto %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Criar trigger
CREATE OR REPLACE TRIGGER trigger_gerar_embedding
  AFTER INSERT OR UPDATE
  ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_embedding_automatico();

-- 4. Armazenar as configurações necessárias
DO $$
BEGIN
  PERFORM set_config('app.settings.supabase_url', 
    coalesce(current_setting('app.settings.supabase_url', true), 'https://rzzzfprgnoywmmjwepzm.supabase.co'), 
    false);
    
  PERFORM set_config('app.settings.supabase_anon_key', 
    coalesce(current_setting('app.settings.supabase_anon_key', true), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enpmcHJnbm95d21tandlcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTMxODksImV4cCI6MjA3NDgyOTE4OX0.GVeAOtDEqJeev7dnDyemdj-W5WXZJdWZo-wUcCXx4wc'), 
    false);
END $$;

-- 5. Comentários
COMMENT ON FUNCTION public.gerar_embedding_automatico() IS 
  'Função trigger que solicita geração de embedding via edge function quando produto é criado/atualizado com mudanças relevantes';

COMMENT ON TRIGGER trigger_gerar_embedding ON public.produtos IS 
  'Trigger automático que mantém embeddings atualizados quando produtos são criados ou editados';