-- Create produtos table
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referencia_interna VARCHAR(50) NOT NULL,
  nome TEXT NOT NULL,
  lote_multiplo INTEGER NOT NULL DEFAULT 1 CHECK (lote_multiplo >= 1),
  unidade_medida VARCHAR(10) NOT NULL,
  quantidade_em_maos NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (quantidade_em_maos >= 0),
  dtr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (dtr >= 0),
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_venda >= 0),
  custo NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (custo >= 0),
  aliquota_ipi NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (aliquota_ipi >= 0 AND aliquota_ipi <= 100),
  cod_trib_icms VARCHAR(50) NOT NULL DEFAULT 'Tributado',
  qtd_cr INTEGER NOT NULL DEFAULT 0 CHECK (qtd_cr >= 0),
  icms_sp_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (icms_sp_percent >= 0 AND icms_sp_percent <= 100),
  grupo_estoque INTEGER NOT NULL DEFAULT 0 CHECK (grupo_estoque >= 0),
  ncm VARCHAR(8) NOT NULL,
  marcadores_produto TEXT[] DEFAULT '{}',
  quantidade_prevista NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (quantidade_prevista >= 0),
  responsavel TEXT,
  narrativa TEXT,
  previsao_chegada DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better search performance
CREATE INDEX idx_produtos_referencia ON public.produtos(referencia_interna);
CREATE INDEX idx_produtos_nome ON public.produtos(nome);
CREATE INDEX idx_produtos_ncm ON public.produtos(ncm);
CREATE INDEX idx_produtos_grupo ON public.produtos(grupo_estoque);

-- Create estoque table for stock movements
CREATE TABLE public.estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO', 'TRANSFERENCIA')),
  quantidade NUMERIC(10,2) NOT NULL,
  quantidade_anterior NUMERIC(10,2) NOT NULL,
  quantidade_atual NUMERIC(10,2) NOT NULL,
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel TEXT,
  observacao TEXT,
  lote VARCHAR(50),
  documento VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for stock movements
CREATE INDEX idx_estoque_produto ON public.estoque(produto_id);
CREATE INDEX idx_estoque_data ON public.estoque(data_movimentacao);
CREATE INDEX idx_estoque_tipo ON public.estoque(tipo_movimentacao);

-- Enable Row Level Security
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for produtos (allow all operations for authenticated users)
CREATE POLICY "Allow all operations on produtos for authenticated users"
ON public.produtos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for estoque (allow all operations for authenticated users)
CREATE POLICY "Allow all operations on estoque for authenticated users"
ON public.estoque
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on produtos
CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();