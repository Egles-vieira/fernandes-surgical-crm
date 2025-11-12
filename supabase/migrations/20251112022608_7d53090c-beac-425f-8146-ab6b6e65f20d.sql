-- Remover policy de INSERT em vendas
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;

-- ATENÇÃO: Agora NINGUÉM pode criar vendas via RLS
-- Isso bloqueará todas as tentativas de INSERT na tabela vendas
-- Use apenas se você planeja adicionar uma nova policy específica depois