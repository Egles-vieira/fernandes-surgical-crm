-- Criar tabela de contatos de clientes
CREATE TABLE IF NOT EXISTS public.contatos_cliente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  is_principal BOOLEAN DEFAULT false,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contatos_cliente ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver contatos de seus clientes"
  ON public.contatos_cliente
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes
      WHERE clientes.id = contatos_cliente.cliente_id
      AND clientes.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar contatos para seus clientes"
  ON public.contatos_cliente
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes
      WHERE clientes.id = contatos_cliente.cliente_id
      AND clientes.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar contatos de seus clientes"
  ON public.contatos_cliente
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes
      WHERE clientes.id = contatos_cliente.cliente_id
      AND clientes.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar contatos de seus clientes"
  ON public.contatos_cliente
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes
      WHERE clientes.id = contatos_cliente.cliente_id
      AND clientes.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_contatos_cliente_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contatos_cliente_updated_at
  BEFORE UPDATE ON public.contatos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contatos_cliente_updated_at();

-- Índices
CREATE INDEX idx_contatos_cliente_cliente_id ON public.contatos_cliente(cliente_id);
CREATE INDEX idx_contatos_cliente_principal ON public.contatos_cliente(cliente_id, is_principal) WHERE is_principal = true;