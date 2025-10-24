-- Adicionar search_path à função de registro de mudanças

DROP FUNCTION IF EXISTS public.registrar_mudanca_cotacao_edi();

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
    WHERE id = auth.uid() 
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
      COALESCE(v_perfil_id, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;