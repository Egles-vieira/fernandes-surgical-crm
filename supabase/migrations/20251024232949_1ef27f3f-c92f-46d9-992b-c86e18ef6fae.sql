-- Permitir que usuários criem seu próprio perfil
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.perfis_usuario;
CREATE POLICY "Users can insert their own profile"
  ON public.perfis_usuario
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Garantir criação automática do perfil antes de registrar mudanças
CREATE OR REPLACE FUNCTION public.registrar_mudanca_step_cotacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Garante que exista um perfil para o usuário atual antes de qualquer FK
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid()
  ) THEN
    INSERT INTO public.perfis_usuario (id)
    VALUES (auth.uid())
    ON CONFLICT (id) DO NOTHING;
  END IF;

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