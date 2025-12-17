-- Tabela para configurações globais de IA
CREATE TABLE IF NOT EXISTS public.ia_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar timestamp
CREATE TRIGGER update_ia_configuracoes_updated_at
  BEFORE UPDATE ON public.ia_configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações iniciais
INSERT INTO public.ia_configuracoes (modulo, ativo, config) VALUES
('global', true, '{"provider": "deepseek", "circuit_breaker": {"limite_falhas": 5, "tempo_reset_segundos": 300}}'),
('edi_analise', true, '{"analise_automatica": true, "fallback_manual": true, "modelo": "deepseek-chat"}'),
('tickets_assistente', true, '{"sugerir_respostas": true, "modelo": "deepseek-chat"}'),
('whatsapp_triagem', true, '{"modelo": "deepseek-chat", "temperature": 0.3}')
ON CONFLICT (modulo) DO NOTHING;

-- RLS
ALTER TABLE public.ia_configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e manager podem visualizar configurações IA" 
  ON public.ia_configuracoes FOR SELECT 
  TO authenticated
  USING (auth_is_admin() OR auth_is_manager());

CREATE POLICY "Admin pode gerenciar configurações IA" 
  ON public.ia_configuracoes FOR ALL 
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Índice para busca por módulo
CREATE INDEX IF NOT EXISTS idx_ia_configuracoes_modulo ON public.ia_configuracoes(modulo);