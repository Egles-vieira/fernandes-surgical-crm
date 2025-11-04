-- Adicionar novos campos à tabela contatos para CRM completo

-- Informações Básicas
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS tratamento TEXT CHECK (tratamento IN ('Sr.', 'Sra.', 'Dr.', 'Dra.', 'Prof.', 'Eng.'));

-- Redes Sociais & Comunicação
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS whatsapp_numero TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS skype_id TEXT;

-- Preferências
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS preferencia_contato TEXT CHECK (preferencia_contato IN ('email', 'telefone', 'whatsapp', 'linkedin'));
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS idioma_preferido TEXT DEFAULT 'pt-BR';
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS melhor_horario_contato TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS frequencia_contato_preferida TEXT CHECK (frequencia_contato_preferida IN ('diaria', 'semanal', 'quinzenal', 'mensal'));

-- LGPD & Consentimentos
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS consentimento_lgpd BOOLEAN DEFAULT false;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS data_consentimento_lgpd TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS aceita_marketing BOOLEAN DEFAULT false;

-- Qualificação & Vendas (BANT)
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS nivel_autoridade TEXT CHECK (nivel_autoridade IN ('decisor', 'influenciador', 'usuario_final', 'bloqueador'));
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS budget_estimado DECIMAL(15,2);
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS timeline_decisao TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS necessidade_identificada TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS score_qualificacao INTEGER CHECK (score_qualificacao >= 0 AND score_qualificacao <= 100);

-- Relacionamento & Hierarquia
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS relacionamento_com UUID REFERENCES public.contatos(id) ON DELETE SET NULL;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS proximo_followup TIMESTAMP WITH TIME ZONE;

-- Enrichment & Tracking
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS origem_lead TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS campanha_origem TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS interesses TEXT[] DEFAULT '{}';

-- Textos Longos
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS dores_identificadas TEXT;
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS objetivos_profissionais TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contatos_linkedin ON public.contatos(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contatos_tags ON public.contatos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contatos_interesses ON public.contatos USING GIN(interesses);
CREATE INDEX IF NOT EXISTS idx_contatos_score ON public.contatos(score_qualificacao) WHERE score_qualificacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contatos_nivel_autoridade ON public.contatos(nivel_autoridade) WHERE nivel_autoridade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contatos_proximo_followup ON public.contatos(proximo_followup) WHERE proximo_followup IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.contatos.tratamento IS 'Título de tratamento do contato (Sr., Sra., Dr., etc.)';
COMMENT ON COLUMN public.contatos.nivel_autoridade IS 'Nível de autoridade no processo de decisão (BANT)';
COMMENT ON COLUMN public.contatos.score_qualificacao IS 'Score de qualificação do lead (0-100)';
COMMENT ON COLUMN public.contatos.consentimento_lgpd IS 'Consentimento LGPD para tratamento de dados';
COMMENT ON COLUMN public.contatos.relacionamento_com IS 'Referência hierárquica a outro contato (superior/gestor)';
COMMENT ON COLUMN public.contatos.tags IS 'Tags para categorização e segmentação';
COMMENT ON COLUMN public.contatos.interesses IS 'Áreas de interesse do contato';