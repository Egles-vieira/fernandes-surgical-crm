-- Adicionar ON DELETE CASCADE para historico_membros_equipe
ALTER TABLE public.historico_membros_equipe 
  DROP CONSTRAINT IF EXISTS historico_membros_equipe_equipe_id_fkey;

ALTER TABLE public.historico_membros_equipe
  ADD CONSTRAINT historico_membros_equipe_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE CASCADE;

-- Verificar e corrigir outras tabelas relacionadas que podem ter o mesmo problema
-- Tabela de clientes se tiver vínculo com equipes
ALTER TABLE public.clientes 
  DROP CONSTRAINT IF EXISTS clientes_equipe_id_fkey;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE SET NULL;

-- Tabela de vendas se tiver vínculo com equipes
ALTER TABLE public.vendas 
  DROP CONSTRAINT IF EXISTS vendas_equipe_id_fkey;

ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_equipe_id_fkey
  FOREIGN KEY (equipe_id)
  REFERENCES public.equipes(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT historico_membros_equipe_equipe_id_fkey ON public.historico_membros_equipe 
  IS 'Permite exclusão em cascata do histórico de membros quando a equipe é excluída';