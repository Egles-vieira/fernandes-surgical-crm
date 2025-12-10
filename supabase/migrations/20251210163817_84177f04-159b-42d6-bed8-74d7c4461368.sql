-- =====================================================
-- ADICIONA CAMPO contato_responsavel_id NA TABELA VENDAS
-- Para separar "contato responsável" (contatos) de "usuário responsável" (auth.users)
-- =====================================================

-- 1. Adicionar novo campo com foreign key correta para contatos
ALTER TABLE public.vendas 
ADD COLUMN IF NOT EXISTS contato_responsavel_id UUID REFERENCES public.contatos(id);

-- 2. Criar índice para o novo campo
CREATE INDEX IF NOT EXISTS idx_vendas_contato_responsavel_id ON public.vendas(contato_responsavel_id);

-- 3. Migrar dados existentes de responsavel_id para contato_responsavel_id
-- (Se houver IDs de contatos salvos incorretamente em responsavel_id)
-- Apenas migra se o ID existir na tabela contatos
UPDATE public.vendas v
SET contato_responsavel_id = v.responsavel_id
WHERE v.responsavel_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.contatos c WHERE c.id = v.responsavel_id);

-- 4. Limpar responsavel_id onde tinha ID de contato (não de usuário)
UPDATE public.vendas v
SET responsavel_id = NULL
WHERE v.responsavel_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v.responsavel_id);