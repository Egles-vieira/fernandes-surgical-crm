-- ============================================
-- FASE 1.3: CRIAR ESTRUTURA (CORRIGIDA)
-- ============================================

-- 1. TABELA DE HIERARQUIA DE ROLES
CREATE TABLE IF NOT EXISTS public.role_hierarquia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  nivel INTEGER NOT NULL,
  pode_acessar_menu_tecnico BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT nivel_positivo CHECK (nivel >= 0)
);

-- Inserir hierarquia dos roles
INSERT INTO public.role_hierarquia (role, nivel, pode_acessar_menu_tecnico, descricao) VALUES
  ('admin', 0, true, 'Administrador do sistema - acesso total'),
  ('diretor_comercial', 1, false, 'Diretor Comercial - acessa tudo de todos, não acessa menu técnico'),
  ('gerente_comercial', 2, false, 'Gerente Comercial - acessa tudo de todos, não acessa menu técnico'),
  ('coordenador_comercial', 3, false, 'Coordenador Comercial - acessa tudo de todos, não acessa menu técnico'),
  ('manager', 3, true, 'Gerente (legacy) - acesso gerencial com menu técnico'),
  ('gestor_equipe', 4, false, 'Gestor de Equipe - acessa tudo da equipe que ele é gestor'),
  ('lider', 4, false, 'Líder (legacy) - acessa equipe'),
  ('representante_comercial', 5, false, 'Representante Comercial - acessa clientes vinculados'),
  ('executivo_contas', 5, false, 'Executivo de Contas - acessa clientes vinculados (contas estratégicas)'),
  ('consultor_vendas', 5, false, 'Consultor de Vendas - acessa clientes da equipe'),
  ('sales', 5, false, 'Vendedor (legacy) - acessa clientes vinculados'),
  ('backoffice', 6, false, 'Backoffice - suporte operacional'),
  ('warehouse', 7, true, 'Almoxarifado - gestão de estoque'),
  ('support', 7, true, 'Suporte - atendimento técnico')
ON CONFLICT (role) DO UPDATE SET
  nivel = EXCLUDED.nivel,
  pode_acessar_menu_tecnico = EXCLUDED.pode_acessar_menu_tecnico,
  descricao = EXCLUDED.descricao;

-- 2. TABELA DE VÍNCULOS USUÁRIO-CLIENTE
CREATE TABLE IF NOT EXISTS public.usuario_clientes_vinculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_vinculo VARCHAR(50) DEFAULT 'principal',
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, cliente_id, tipo_vinculo),
  CONSTRAINT data_fim_maior_inicio CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- 3. TABELA DE HIERARQUIA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuario_hierarquia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subordinado_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  superior_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subordinado_id, superior_id),
  CONSTRAINT nao_pode_ser_proprio_superior CHECK (subordinado_id != superior_id),
  CONSTRAINT data_fim_maior_inicio_hierarquia CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- 4. ADICIONAR CAMPOS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'vendedor_vinculado_id'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN vendedor_vinculado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'equipes' AND column_name = 'tipo_equipe'
  ) THEN
    ALTER TABLE public.equipes ADD COLUMN tipo_equipe VARCHAR(50) DEFAULT 'vendas';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'equipes' AND column_name = 'gestor_id'
  ) THEN
    ALTER TABLE public.equipes ADD COLUMN gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_usuario_clientes_vinculo_usuario ON public.usuario_clientes_vinculo(usuario_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_usuario_clientes_vinculo_cliente ON public.usuario_clientes_vinculo(cliente_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_usuario_hierarquia_subordinado ON public.usuario_hierarquia(subordinado_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_usuario_hierarquia_superior ON public.usuario_hierarquia(superior_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_role_hierarquia_nivel ON public.role_hierarquia(nivel);
CREATE INDEX IF NOT EXISTS idx_user_roles_vendedor_vinculado ON public.user_roles(vendedor_vinculado_id) WHERE vendedor_vinculado_id IS NOT NULL;

-- 6. HABILITAR RLS
ALTER TABLE public.role_hierarquia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_clientes_vinculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_hierarquia ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS (usando has_any_role com casting correto)
CREATE POLICY "Todos podem visualizar hierarquia de roles" ON public.role_hierarquia FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuário vê seus vínculos de clientes" ON public.usuario_clientes_vinculo FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid() OR 
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'coordenador_comercial'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Admins e gestores podem inserir vínculos" ON public.usuario_clientes_vinculo FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'coordenador_comercial'::app_role, 'manager'::app_role, 'gestor_equipe'::app_role])
  );

CREATE POLICY "Admins e gestores podem atualizar vínculos" ON public.usuario_clientes_vinculo FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'coordenador_comercial'::app_role, 'manager'::app_role, 'gestor_equipe'::app_role])
  );

CREATE POLICY "Usuário vê sua hierarquia" ON public.usuario_hierarquia FOR SELECT TO authenticated
  USING (
    subordinado_id = auth.uid() OR 
    superior_id = auth.uid() OR 
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'coordenador_comercial'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Admins e gestores podem gerenciar hierarquia" ON public.usuario_hierarquia FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'coordenador_comercial'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'diretor_comercial'::app_role, 'gerente_comercial'::app_role, 'coordenador_comercial'::app_role, 'manager'::app_role]));

-- 8. TRIGGERS
CREATE TRIGGER update_usuario_clientes_vinculo_timestamp BEFORE UPDATE ON public.usuario_clientes_vinculo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usuario_hierarquia_timestamp BEFORE UPDATE ON public.usuario_hierarquia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. FUNÇÕES AUXILIARES
CREATE OR REPLACE FUNCTION public.get_nivel_hierarquico(_user_id UUID)
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT MIN(rh.nivel) FROM public.user_roles ur
  JOIN public.role_hierarquia rh ON rh.role = ur.role WHERE ur.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_access_menu_tecnico(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(bool_or(rh.pode_acessar_menu_tecnico), false) FROM public.user_roles ur
  JOIN public.role_hierarquia rh ON rh.role = ur.role WHERE ur.user_id = _user_id;
$$;

-- 10. COMENTÁRIOS
COMMENT ON TABLE public.role_hierarquia IS 'Define a hierarquia e permissões de cada role do sistema';
COMMENT ON TABLE public.usuario_clientes_vinculo IS 'Vincula usuários específicos (representantes, executivos) a clientes';
COMMENT ON TABLE public.usuario_hierarquia IS 'Define relações hierárquicas superior-subordinado entre usuários';
COMMENT ON FUNCTION public.get_nivel_hierarquico IS 'Retorna o menor nível hierárquico do usuário (quanto menor, mais alto)';
COMMENT ON FUNCTION public.can_access_menu_tecnico IS 'Verifica se o usuário pode acessar o menu técnico baseado em seus roles';