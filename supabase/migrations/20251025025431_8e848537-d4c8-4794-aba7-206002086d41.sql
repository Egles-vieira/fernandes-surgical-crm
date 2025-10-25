-- Tabela DE-PARA de Unidades de Medida
CREATE TABLE public.edi_unidades_medida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plataforma_id UUID REFERENCES public.plataformas_edi(id) ON DELETE CASCADE,
  codigo_portal VARCHAR NOT NULL,
  descricao_portal TEXT NOT NULL,
  abreviacao_portal VARCHAR,
  unidade_medida_interna VARCHAR NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES public.perfis_usuario(id),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plataforma_id, codigo_portal)
);

-- Tabela DE-PARA de Condições de Pagamento
CREATE TABLE public.edi_condicoes_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plataforma_id UUID REFERENCES public.plataformas_edi(id) ON DELETE CASCADE,
  codigo_portal VARCHAR NOT NULL,
  descricao_portal TEXT NOT NULL,
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  codigo_integracao VARCHAR,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES public.perfis_usuario(id),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plataforma_id, codigo_portal)
);

-- Adicionar colunas na tabela edi_cotacoes_itens
ALTER TABLE public.edi_cotacoes_itens 
ADD COLUMN IF NOT EXISTS id_unidade_medida_portal VARCHAR,
ADD COLUMN IF NOT EXISTS unidade_medida_portal VARCHAR;

-- Adicionar colunas na tabela edi_cotacoes
ALTER TABLE public.edi_cotacoes 
ADD COLUMN IF NOT EXISTS id_forma_pagamento_portal VARCHAR,
ADD COLUMN IF NOT EXISTS forma_pagamento_portal VARCHAR,
ADD COLUMN IF NOT EXISTS condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id);

-- RLS para edi_unidades_medida
ALTER TABLE public.edi_unidades_medida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar unidades de medida"
ON public.edi_unidades_medida
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales podem visualizar unidades de medida"
ON public.edi_unidades_medida
FOR SELECT
USING (has_role(auth.uid(), 'sales'::app_role) AND ativo = true);

-- RLS para edi_condicoes_pagamento
ALTER TABLE public.edi_condicoes_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar condições de pagamento"
ON public.edi_condicoes_pagamento
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales podem visualizar condições de pagamento"
ON public.edi_condicoes_pagamento
FOR SELECT
USING (has_role(auth.uid(), 'sales'::app_role) AND ativo = true);

-- Triggers para atualizado_em
CREATE TRIGGER update_edi_unidades_medida_updated_at
BEFORE UPDATE ON public.edi_unidades_medida
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at_edi();

CREATE TRIGGER update_edi_condicoes_pagamento_updated_at
BEFORE UPDATE ON public.edi_condicoes_pagamento
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at_edi();