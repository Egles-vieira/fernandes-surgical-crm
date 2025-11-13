-- Adicionar campo nome_completo à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nome_completo TEXT;

-- Criar índice para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_profiles_nome_completo ON public.profiles(nome_completo);

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.nome_completo IS 'Nome completo do usuário para exibição no sistema';