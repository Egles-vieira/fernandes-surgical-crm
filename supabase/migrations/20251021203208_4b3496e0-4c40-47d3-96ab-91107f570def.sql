-- Criar tabela de filas de atendimento
CREATE TABLE public.filas_atendimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  ordem INTEGER NOT NULL DEFAULT 0,
  esta_ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS
ALTER TABLE public.filas_atendimento ENABLE ROW LEVEL SECURITY;

-- Políticas para filas
CREATE POLICY "Todos podem visualizar filas ativas"
  ON public.filas_atendimento FOR SELECT
  USING (esta_ativa = true);

CREATE POLICY "Admins podem gerenciar filas"
  ON public.filas_atendimento FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar campo fila_id nos tickets
ALTER TABLE public.tickets 
ADD COLUMN fila_id UUID REFERENCES public.filas_atendimento(id);

-- Criar índice
CREATE INDEX idx_tickets_fila_id ON public.tickets(fila_id);

-- Trigger para updated_at
CREATE TRIGGER update_filas_atendimento_updated_at
  BEFORE UPDATE ON public.filas_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Popular filas iniciais
INSERT INTO public.filas_atendimento (nome, descricao, cor, ordem) VALUES
  ('Tratativa Comercial', 'Questões comerciais, orçamentos e negociações', '#10B981', 1),
  ('Importação', 'Processos de importação de produtos', '#F59E0B', 2),
  ('Análise Técnica', 'Avaliação técnica de produtos e soluções', '#3B82F6', 3),
  ('Envio para Fabricante', 'Tickets encaminhados ao fabricante', '#8B5CF6', 4),
  ('Devolução', 'Processos de devolução e troca', '#EF4444', 5),
  ('Resolvido', 'Tickets finalizados com sucesso', '#22C55E', 6);