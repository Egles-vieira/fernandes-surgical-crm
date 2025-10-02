-- Criar tabela de condições de pagamento
CREATE TABLE public.condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_integracao INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de tipos de frete
CREATE TABLE public.tipos_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de tipos de pedido
CREATE TABLE public.tipos_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (leitura para usuários autenticados)
CREATE POLICY "Authenticated users can view condicoes_pagamento"
ON public.condicoes_pagamento FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view tipos_frete"
ON public.tipos_frete FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view tipos_pedido"
ON public.tipos_pedido FOR SELECT
TO authenticated
USING (true);

-- Inserir dados nas tabelas
INSERT INTO public.condicoes_pagamento (nome, codigo_integracao) VALUES
('A VISTA', 1),
('30 DIAS', 7),
('60 DIAS', 18),
('90 DIAS', 41),
('35 DIAS', 8),
('28 DIAS', 6),
('45 DIAS', 30),
('30/45 DIAS', 57),
('28/35/42/49', 211),
('30/45/60 DIAS', 11),
('10 DIAS', 4),
('21 DIAS', 15),
('28/35/42 DIAS', 13),
('28/35 DIAS', 27);

INSERT INTO public.tipos_frete (nome) VALUES
('CIF'),
('CIF - INCLUSÃO NA NF'),
('FOB');

INSERT INTO public.tipos_pedido (nome) VALUES
('Normal'),
('Reserva'),
('Amostra'),
('Brinde'),
('Devolução'),
('Doação');

-- Adicionar colunas na tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
ADD COLUMN tipo_frete_id UUID REFERENCES public.tipos_frete(id),
ADD COLUMN tipo_pedido_id UUID REFERENCES public.tipos_pedido(id);