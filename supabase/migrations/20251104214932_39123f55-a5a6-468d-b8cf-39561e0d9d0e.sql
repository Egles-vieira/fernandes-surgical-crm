-- Criar enum para status de solicitação
CREATE TYPE status_solicitacao_cadastro AS ENUM ('rascunho', 'em_analise', 'aprovado', 'rejeitado');

-- Criar tabela de solicitações de cadastro
CREATE TABLE public.solicitacoes_cadastro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj VARCHAR(18) NOT NULL,
  status status_solicitacao_cadastro NOT NULL DEFAULT 'rascunho',
  dados_coletados JSONB DEFAULT '{}'::jsonb,
  contatos JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  motivo_rejeicao TEXT,
  excluido_em TIMESTAMP WITH TIME ZONE
);

-- Criar índices
CREATE INDEX idx_solicitacoes_cadastro_criado_por ON public.solicitacoes_cadastro(criado_por);
CREATE INDEX idx_solicitacoes_cadastro_status ON public.solicitacoes_cadastro(status);
CREATE INDEX idx_solicitacoes_cadastro_cnpj ON public.solicitacoes_cadastro(cnpj);

-- Habilitar RLS
ALTER TABLE public.solicitacoes_cadastro ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver suas próprias solicitações
CREATE POLICY "Usuários podem ver suas solicitações"
ON public.solicitacoes_cadastro
FOR SELECT
USING (
  criado_por = auth.uid() 
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Usuários podem criar solicitações
CREATE POLICY "Usuários podem criar solicitações"
ON public.solicitacoes_cadastro
FOR INSERT
WITH CHECK (
  criado_por = auth.uid() 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
);

-- Usuários podem atualizar suas próprias solicitações em rascunho
CREATE POLICY "Usuários podem atualizar suas solicitações em rascunho"
ON public.solicitacoes_cadastro
FOR UPDATE
USING (
  (criado_por = auth.uid() AND status = 'rascunho')
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Admins e managers podem deletar (soft delete)
CREATE POLICY "Admins podem deletar solicitações"
ON public.solicitacoes_cadastro
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Trigger para atualizar updated_at
CREATE TRIGGER atualizar_solicitacoes_cadastro_updated_at
BEFORE UPDATE ON public.solicitacoes_cadastro
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();