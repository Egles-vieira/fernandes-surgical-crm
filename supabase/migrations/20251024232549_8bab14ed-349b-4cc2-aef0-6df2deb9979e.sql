-- Corrigir constraint e trigger de histórico EDI

-- 1. Remover a constraint de foreign key problemática
ALTER TABLE public.edi_historico_mudancas 
  DROP CONSTRAINT IF EXISTS edi_historico_mudancas_alterado_por_fkey;

-- 2. Recriar o trigger com lógica corrigida para buscar o perfil do usuário
CREATE OR REPLACE FUNCTION public.registrar_mudanca_cotacao_edi()
RETURNS TRIGGER AS $$
DECLARE
  v_perfil_id UUID;
BEGIN
  -- Se houver alteração no step_atual, registrar
  IF (TG_OP = 'UPDATE' AND OLD.step_atual IS DISTINCT FROM NEW.step_atual) THEN
    
    -- Buscar o perfil_usuario_id baseado no auth.uid()
    SELECT id INTO v_perfil_id 
    FROM public.perfis_usuario 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    
    -- Adicionar ao histórico de steps
    NEW.historico_steps = COALESCE(NEW.historico_steps, '[]'::jsonb) || 
      jsonb_build_object(
        'step', NEW.step_atual,
        'timestamp', NOW(),
        'usuario_id', auth.uid()
      );
    
    -- Registrar na tabela de histórico (mesmo se não encontrar perfil)
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
      COALESCE(v_perfil_id, auth.uid())  -- Usa perfil_id se encontrado, senão usa auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;