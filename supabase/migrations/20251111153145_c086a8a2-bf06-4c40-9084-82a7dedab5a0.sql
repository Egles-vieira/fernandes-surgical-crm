-- Remover a constraint existente e recriar com ON DELETE CASCADE
ALTER TABLE public.historico_atividades_equipe 
  DROP CONSTRAINT IF EXISTS historico_atividades_equipe_equipe_id_fkey;

-- Recriar a constraint com ON DELETE CASCADE
ALTER TABLE public.historico_atividades_equipe
  ADD CONSTRAINT historico_atividades_equipe_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE CASCADE;

-- Fazer o mesmo para outras tabelas que referenciam equipes
ALTER TABLE public.membros_equipe 
  DROP CONSTRAINT IF EXISTS membros_equipe_equipe_id_fkey;

ALTER TABLE public.membros_equipe
  ADD CONSTRAINT membros_equipe_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE CASCADE;

ALTER TABLE public.metas_equipe 
  DROP CONSTRAINT IF EXISTS metas_equipe_equipe_id_fkey;

ALTER TABLE public.metas_equipe
  ADD CONSTRAINT metas_equipe_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE CASCADE;

ALTER TABLE public.historico_lideranca_equipe 
  DROP CONSTRAINT IF EXISTS historico_lideranca_equipe_equipe_id_fkey;

ALTER TABLE public.historico_lideranca_equipe
  ADD CONSTRAINT historico_lideranca_equipe_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE CASCADE;

-- Comentário explicativo
COMMENT ON CONSTRAINT historico_atividades_equipe_equipe_id_fkey ON public.historico_atividades_equipe 
  IS 'Permite exclusão em cascata do histórico quando a equipe é excluída';