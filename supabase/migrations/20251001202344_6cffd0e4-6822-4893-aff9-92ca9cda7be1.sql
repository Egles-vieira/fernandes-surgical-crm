-- Create vendas table
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_venda TEXT NOT NULL UNIQUE,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  data_venda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valor_total NUMERIC NOT NULL DEFAULT 0.00,
  desconto NUMERIC NOT NULL DEFAULT 0.00,
  valor_final NUMERIC NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovada', 'cancelada')),
  observacoes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendas_itens table
CREATE TABLE public.vendas_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  desconto NUMERIC NOT NULL DEFAULT 0.00,
  valor_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendas
CREATE POLICY "Users can view their own vendas"
ON public.vendas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vendas"
ON public.vendas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendas"
ON public.vendas
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendas"
ON public.vendas
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for vendas_itens
CREATE POLICY "Users can view their vendas_itens"
ON public.vendas_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendas
    WHERE vendas.id = vendas_itens.venda_id
    AND vendas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create vendas_itens"
ON public.vendas_itens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendas
    WHERE vendas.id = vendas_itens.venda_id
    AND vendas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update vendas_itens"
ON public.vendas_itens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vendas
    WHERE vendas.id = vendas_itens.venda_id
    AND vendas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete vendas_itens"
ON public.vendas_itens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.vendas
    WHERE vendas.id = vendas_itens.venda_id
    AND vendas.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_vendas_updated_at
BEFORE UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_vendas_user_id ON public.vendas(user_id);
CREATE INDEX idx_vendas_numero ON public.vendas(numero_venda);
CREATE INDEX idx_vendas_itens_venda_id ON public.vendas_itens(venda_id);
CREATE INDEX idx_vendas_itens_produto_id ON public.vendas_itens(produto_id);