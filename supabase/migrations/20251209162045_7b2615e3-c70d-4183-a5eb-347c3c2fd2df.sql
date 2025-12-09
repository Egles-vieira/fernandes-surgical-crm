-- Adicionar campo para indicar se atividade foi concluída no prazo
ALTER TABLE public.atividades 
ADD COLUMN IF NOT EXISTS concluida_no_prazo BOOLEAN DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.atividades.concluida_no_prazo IS 'Indica se a atividade foi concluída dentro do prazo (true) ou atrasada (false). NULL se não concluída ou sem data de vencimento.';