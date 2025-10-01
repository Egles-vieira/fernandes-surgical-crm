-- Create ENUM types
CREATE TYPE public.identificacao_tipo AS ENUM ('Cliente', 'Fornecedor', 'Ambos');
CREATE TYPE public.natureza_tipo AS ENUM ('Juridica', 'Fisica');
CREATE TYPE public.yes_no AS ENUM ('YES', 'NO');
CREATE TYPE public.tipo_endereco AS ENUM ('principal', 'entrega', 'cobranca');

-- Create clientes table
CREATE TABLE public.clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    cod_emitente INTEGER NOT NULL,
    nome_emit TEXT NOT NULL,
    identific identificacao_tipo NOT NULL DEFAULT 'Cliente',
    natureza natureza_tipo NOT NULL DEFAULT 'Juridica',
    nome_abrev VARCHAR(100) NOT NULL,
    cod_gr_cli INTEGER,
    cod_rep INTEGER,
    cgc VARCHAR(14) NOT NULL,
    ins_estadual VARCHAR(20),
    atividade VARCHAR(100),
    coligada VARCHAR(100),
    telefone1 VARCHAR(20),
    e_mail VARCHAR(255),
    email_xml VARCHAR(255),
    email_financeiro VARCHAR(255),
    equipevendas VARCHAR(100),
    cod_suframa VARCHAR(50),
    lim_credito NUMERIC(15,2) DEFAULT 0.00,
    ind_cre_cli VARCHAR(50) DEFAULT 'Normal',
    limite_disponivel NUMERIC(15,2) DEFAULT 0.00,
    cod_cond_pag INTEGER DEFAULT 0,
    cond_pag_fixa yes_no DEFAULT 'NO',
    nat_operacao VARCHAR(10),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_cod_emitente_per_user UNIQUE (user_id, cod_emitente),
    CONSTRAINT unique_cgc_per_user UNIQUE (user_id, cgc)
);

-- Create enderecos_clientes table
CREATE TABLE public.enderecos_clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    tipo tipo_endereco NOT NULL DEFAULT 'principal',
    cod_entrega VARCHAR(50) DEFAULT 'Padrão',
    endereco VARCHAR(255) NOT NULL,
    cep VARCHAR(8) NOT NULL,
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    ibge VARCHAR(10),
    estado VARCHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil',
    ins_estadual VARCHAR(20),
    hora_entrega TIME,
    is_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for clientes
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_clientes_cgc ON public.clientes(cgc);
CREATE INDEX idx_clientes_nome_emit ON public.clientes(nome_emit);
CREATE INDEX idx_clientes_cod_emitente ON public.clientes(cod_emitente);

-- Create indexes for enderecos_clientes
CREATE INDEX idx_enderecos_cliente_id ON public.enderecos_clientes(cliente_id);
CREATE INDEX idx_enderecos_cliente_tipo ON public.enderecos_clientes(cliente_id, tipo);
CREATE INDEX idx_enderecos_cep ON public.enderecos_clientes(cep);
CREATE INDEX idx_enderecos_cidade_estado ON public.enderecos_clientes(cidade, estado);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos_clientes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clientes
CREATE POLICY "Users can view their own clientes"
ON public.clientes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clientes"
ON public.clientes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes"
ON public.clientes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes"
ON public.clientes
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for enderecos_clientes
CREATE POLICY "Users can view enderecos of their clientes"
ON public.enderecos_clientes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE clientes.id = enderecos_clientes.cliente_id
    AND clientes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create enderecos for their clientes"
ON public.enderecos_clientes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE clientes.id = enderecos_clientes.cliente_id
    AND clientes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update enderecos of their clientes"
ON public.enderecos_clientes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE clientes.id = enderecos_clientes.cliente_id
    AND clientes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete enderecos of their clientes"
ON public.enderecos_clientes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE clientes.id = enderecos_clientes.cliente_id
    AND clientes.user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enderecos_clientes_updated_at
BEFORE UPDATE ON public.enderecos_clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();