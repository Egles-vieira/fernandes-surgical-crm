-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  entidade_id UUID,
  entidade_tipo VARCHAR(50),
  lida BOOLEAN DEFAULT false,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  lida_em TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Criar índices para performance
CREATE INDEX idx_notificacoes_usuario_id ON public.notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX idx_notificacoes_criada_em ON public.notificacoes(criada_em DESC);
CREATE INDEX idx_notificacoes_usuario_lida ON public.notificacoes(usuario_id, lida);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários só veem suas próprias notificações
CREATE POLICY "Usuários podem ver suas notificações"
  ON public.notificacoes
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas notificações"
  ON public.notificacoes
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Sistema pode criar notificações"
  ON public.notificacoes
  FOR INSERT
  WITH CHECK (true);

-- Função para limpar notificações antigas (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION limpar_notificacoes_antigas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notificacoes
  WHERE criada_em < (now() - INTERVAL '30 days');
END;
$$;

-- Comentários
COMMENT ON TABLE public.notificacoes IS 'Tabela de notificações do sistema para usuários';
COMMENT ON COLUMN public.notificacoes.tipo IS 'Tipos: pedido_confirmado, cotacao_reaberta, ticket_criado, etc';
COMMENT ON COLUMN public.notificacoes.metadata IS 'Dados adicionais em JSON para a notificação';