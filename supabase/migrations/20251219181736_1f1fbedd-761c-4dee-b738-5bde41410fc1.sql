-- Adicionar coluna de descrição aos jobs
ALTER TABLE public.jobs_recalculo_oportunidade 
ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT 'Recálculo automático do valor total da oportunidade baseado na soma dos itens. Dispara quando itens são atualizados via batch update.',
ADD COLUMN IF NOT EXISTS tipo_job TEXT DEFAULT 'recalculo_valor_oportunidade',
ADD COLUMN IF NOT EXISTS regra TEXT DEFAULT 'Soma (quantidade * preco_unitario - valor_desconto) de todos os itens da oportunidade e atualiza o campo valor na tabela oportunidades.';

-- Comentários na tabela e colunas para documentação
COMMENT ON TABLE public.jobs_recalculo_oportunidade IS 'Fila de jobs assíncronos para recálculo de valores de oportunidades. Criada para evitar locks síncronos durante batch updates de itens.';

COMMENT ON COLUMN public.jobs_recalculo_oportunidade.descricao IS 'Descrição do propósito do job e contexto de criação';
COMMENT ON COLUMN public.jobs_recalculo_oportunidade.tipo_job IS 'Tipo/categoria do job para identificação';
COMMENT ON COLUMN public.jobs_recalculo_oportunidade.regra IS 'Regra de negócio executada pelo job';
COMMENT ON COLUMN public.jobs_recalculo_oportunidade.status IS 'Status: pending (aguardando), processing (executando), completed (concluído), failed (erro)';
COMMENT ON COLUMN public.jobs_recalculo_oportunidade.tentativas IS 'Número de tentativas de processamento';
COMMENT ON COLUMN public.jobs_recalculo_oportunidade.erro IS 'Mensagem de erro caso o job falhe';