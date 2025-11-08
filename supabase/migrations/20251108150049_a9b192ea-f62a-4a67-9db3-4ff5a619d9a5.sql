-- Atualizar política RLS para permitir que líderes também criem equipes
DROP POLICY IF EXISTS "Admins can manage teams" ON public.equipes;

CREATE POLICY "Admins and leaders can create teams"
ON public.equipes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'lider')
);

CREATE POLICY "Admins can update and delete teams"
ON public.equipes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teams"
ON public.equipes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Criar função para adicionar líder automaticamente como membro da equipe
CREATE OR REPLACE FUNCTION public.adicionar_lider_como_membro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Adicionar o líder como membro da equipe automaticamente
  IF NEW.lider_equipe_id IS NOT NULL THEN
    INSERT INTO public.membros_equipe (equipe_id, usuario_id)
    VALUES (NEW.id, NEW.lider_equipe_id)
    ON CONFLICT (equipe_id, usuario_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função após inserir uma equipe
DROP TRIGGER IF EXISTS trigger_adicionar_lider_como_membro ON public.equipes;

CREATE TRIGGER trigger_adicionar_lider_como_membro
AFTER INSERT ON public.equipes
FOR EACH ROW
EXECUTE FUNCTION public.adicionar_lider_como_membro();

-- Também executar quando o líder for atualizado
DROP TRIGGER IF EXISTS trigger_atualizar_lider_como_membro ON public.equipes;

CREATE TRIGGER trigger_atualizar_lider_como_membro
AFTER UPDATE OF lider_equipe_id ON public.equipes
FOR EACH ROW
WHEN (OLD.lider_equipe_id IS DISTINCT FROM NEW.lider_equipe_id)
EXECUTE FUNCTION public.adicionar_lider_como_membro();