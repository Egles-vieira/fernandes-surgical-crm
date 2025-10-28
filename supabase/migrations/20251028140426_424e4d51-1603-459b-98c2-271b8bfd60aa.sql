-- ============================================
-- PARTE 2: ESTRUTURA HIERÁRQUICA - CAMPOS E POLÍTICAS
-- ============================================

-- 1. Adicionar campo vendedor_vinculado_id na tabela user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS vendedor_vinculado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_roles.vendedor_vinculado_id IS 'Para usuários backoffice: ID do vendedor ao qual estão vinculados';

-- 2. Adicionar campos hierárquicos na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.clientes.vendedor_id IS 'Vendedor responsável por este cliente (obrigatório)';
COMMENT ON COLUMN public.clientes.equipe_id IS 'Equipe à qual o cliente pertence';

CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON public.clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_equipe ON public.clientes(equipe_id);

-- 3. Adicionar campos hierárquicos na tabela oportunidades
ALTER TABLE public.oportunidades 
ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor ON public.oportunidades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_equipe ON public.oportunidades(equipe_id);

-- 4. Adicionar campos hierárquicos e de aprovação na tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requer_aprovacao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON public.vendas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendas_equipe ON public.vendas(equipe_id);

-- 5. Criar tabela de interações
CREATE TABLE IF NOT EXISTS public.interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('reuniao', 'ligacao', 'email', 'whatsapp', 'visita', 'outro')),
    descricao TEXT NOT NULL,
    data_interacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_cliente ON public.interacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_usuario ON public.interacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_data ON public.interacoes(data_interacao);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

-- 6. Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade_tipo VARCHAR(50) NOT NULL,
    entidade_id UUID NOT NULL,
    acao VARCHAR(50) NOT NULL,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_entidade ON public.logs_auditoria(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario ON public.logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_created ON public.logs_auditoria(created_at);

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- 7. Criar funções auxiliares para verificação hierárquica

-- Função para verificar se usuário é líder de uma equipe
CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id UUID, _equipe_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM equipes 
        WHERE id = _equipe_id 
        AND lider_equipe_id = _user_id
        AND esta_ativa = true
    )
$$;

-- Função para obter equipe de um usuário
CREATE OR REPLACE FUNCTION public.get_user_team(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT equipe_id 
    FROM membros_equipe 
    WHERE usuario_id = _user_id
    LIMIT 1
$$;

-- Função para verificar se usuário é vendedor vinculado a um backoffice
CREATE OR REPLACE FUNCTION public.get_linked_seller(_backoffice_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT vendedor_vinculado_id 
    FROM user_roles 
    WHERE user_id = _backoffice_user_id 
    AND vendedor_vinculado_id IS NOT NULL
    LIMIT 1
$$;

-- Função para verificar se usuário pode acessar um cliente
CREATE OR REPLACE FUNCTION public.can_access_cliente(_user_id UUID, _cliente_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vendedor_id UUID;
    v_equipe_id UUID;
    v_is_admin BOOLEAN;
    v_is_lider BOOLEAN;
    v_is_vendedor BOOLEAN;
    v_is_backoffice BOOLEAN;
    v_user_equipe UUID;
    v_vendedor_vinculado UUID;
BEGIN
    SELECT vendedor_id, equipe_id INTO v_vendedor_id, v_equipe_id
    FROM clientes WHERE id = _cliente_id;
    
    v_is_admin := has_role(_user_id, 'admin');
    v_is_lider := has_role(_user_id, 'lider');
    v_is_vendedor := has_role(_user_id, 'sales');
    v_is_backoffice := has_role(_user_id, 'backoffice');
    
    IF v_is_admin THEN
        RETURN true;
    END IF;
    
    IF v_is_lider THEN
        v_user_equipe := get_user_team(_user_id);
        IF v_equipe_id = v_user_equipe OR is_team_leader(_user_id, v_equipe_id) THEN
            RETURN true;
        END IF;
    END IF;
    
    IF v_is_vendedor AND v_vendedor_id = _user_id THEN
        RETURN true;
    END IF;
    
    IF v_is_backoffice THEN
        v_vendedor_vinculado := get_linked_seller(_user_id);
        IF v_vendedor_id = v_vendedor_vinculado THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$;

-- 8. Trigger para atualizar updated_at em interações
DROP TRIGGER IF EXISTS update_interacoes_updated_at ON public.interacoes;
CREATE TRIGGER update_interacoes_updated_at
    BEFORE UPDATE ON public.interacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários nas tabelas e funções
COMMENT ON TABLE public.interacoes IS 'Registra todas as interações com clientes (reuniões, ligações, emails, etc)';
COMMENT ON TABLE public.logs_auditoria IS 'Log de auditoria para rastrear alterações críticas no sistema';
COMMENT ON FUNCTION public.can_access_cliente IS 'Verifica se um usuário pode acessar um cliente baseado na hierarquia (líder/vendedor/backoffice)';
COMMENT ON FUNCTION public.is_team_leader IS 'Verifica se um usuário é líder de uma equipe específica';
COMMENT ON FUNCTION public.get_user_team IS 'Retorna o ID da equipe de um usuário';
COMMENT ON FUNCTION public.get_linked_seller IS 'Retorna o ID do vendedor vinculado a um usuário backoffice';