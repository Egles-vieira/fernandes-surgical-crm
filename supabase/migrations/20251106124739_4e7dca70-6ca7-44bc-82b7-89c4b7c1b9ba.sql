-- Criar tabela para configurações globais do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler as configurações
CREATE POLICY "Todos podem ver configurações do sistema"
  ON public.configuracoes_sistema
  FOR SELECT
  USING (true);

-- Policy: Apenas admins podem atualizar
CREATE POLICY "Admins podem atualizar configurações"
  ON public.configuracoes_sistema
  FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policy: Apenas admins podem inserir
CREATE POLICY "Admins podem inserir configurações"
  ON public.configuracoes_sistema
  FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_configuracao_sistema_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_configuracao_sistema
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_configuracao_sistema_timestamp();

-- Inserir configuração padrão de tema (vazio inicialmente)
INSERT INTO public.configuracoes_sistema (chave, valor)
VALUES ('theme_customization', '{}')
ON CONFLICT (chave) DO NOTHING;