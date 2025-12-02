-- Enum para status de entrega
CREATE TYPE public.status_entrega AS ENUM ('pendente', 'em_transito', 'entregue', 'devolvido', 'cancelado');

-- Enum para status de nota fiscal
CREATE TYPE public.status_nota_fiscal AS ENUM ('emitida', 'cancelada', 'denegada', 'inutilizada');

-- Tabela de entregas
CREATE TABLE public.vendas_entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  codigo_rastreio TEXT,
  transportadora_nome TEXT,
  transportadora_cnpj TEXT,
  status_entrega public.status_entrega NOT NULL DEFAULT 'pendente',
  data_previsao DATE,
  data_entrega DATE,
  url_rastreio TEXT,
  observacoes TEXT,
  peso_kg NUMERIC(10,3),
  volumes INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notas fiscais
CREATE TABLE public.vendas_notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  numero_nf TEXT NOT NULL,
  serie_nf TEXT DEFAULT '1',
  chave_acesso TEXT,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  status public.status_nota_fiscal NOT NULL DEFAULT 'emitida',
  url_danfe TEXT,
  url_xml TEXT,
  natureza_operacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_vendas_entregas_venda_id ON public.vendas_entregas(venda_id);
CREATE INDEX idx_vendas_entregas_status ON public.vendas_entregas(status_entrega);
CREATE INDEX idx_vendas_notas_fiscais_venda_id ON public.vendas_notas_fiscais(venda_id);
CREATE INDEX idx_vendas_notas_fiscais_numero ON public.vendas_notas_fiscais(numero_nf);
CREATE INDEX idx_vendas_notas_fiscais_chave ON public.vendas_notas_fiscais(chave_acesso);

-- Triggers para updated_at
CREATE TRIGGER update_vendas_entregas_updated_at
  BEFORE UPDATE ON public.vendas_entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_notas_fiscais_updated_at
  BEFORE UPDATE ON public.vendas_notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.vendas_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_notas_fiscais ENABLE ROW LEVEL SECURITY;

-- RLS Policies para entregas
CREATE POLICY "Usuários podem ver entregas de vendas acessíveis"
  ON public.vendas_entregas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vendas v
      WHERE v.id = vendas_entregas.venda_id
      AND public.pode_acessar_venda(auth.uid(), v.id)
    )
  );

CREATE POLICY "Admins e managers podem gerenciar entregas"
  ON public.vendas_entregas
  FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS Policies para notas fiscais
CREATE POLICY "Usuários podem ver NFs de vendas acessíveis"
  ON public.vendas_notas_fiscais
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vendas v
      WHERE v.id = vendas_notas_fiscais.venda_id
      AND public.pode_acessar_venda(auth.uid(), v.id)
    )
  );

CREATE POLICY "Admins e managers podem gerenciar NFs"
  ON public.vendas_notas_fiscais
  FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));