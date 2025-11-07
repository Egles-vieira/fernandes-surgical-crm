-- ============================================
-- FASE 2: FUNÇÕES AVANÇADAS DE HIERARQUIA
-- ============================================

-- 1. FUNÇÃO: OBTER TODOS OS SUBORDINADOS (RECURSIVA)
-- Retorna todos os subordinados diretos e indiretos de um usuário
CREATE OR REPLACE FUNCTION public.get_usuarios_subordinados(_user_id UUID)
RETURNS TABLE(subordinado_id UUID, nivel_distancia INTEGER)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subordinados AS (
    -- Caso base: subordinados diretos
    SELECT 
      uh.subordinado_id,
      1 as nivel_distancia
    FROM public.usuario_hierarquia uh
    WHERE uh.superior_id = _user_id
      AND uh.ativo = true
      AND (uh.data_fim IS NULL OR uh.data_fim >= CURRENT_DATE)
    
    UNION ALL
    
    -- Caso recursivo: subordinados dos subordinados
    SELECT 
      uh.subordinado_id,
      s.nivel_distancia + 1
    FROM public.usuario_hierarquia uh
    INNER JOIN subordinados s ON s.subordinado_id = uh.superior_id
    WHERE uh.ativo = true
      AND (uh.data_fim IS NULL OR uh.data_fim >= CURRENT_DATE)
      AND s.nivel_distancia < 10  -- Limitar profundidade para evitar loops
  )
  SELECT DISTINCT subordinado_id, MIN(nivel_distancia) as nivel_distancia
  FROM subordinados
  GROUP BY subordinado_id;
$$;

-- 2. FUNÇÃO: OBTER CLIENTES ACESSÍVEIS
-- Retorna todos os clientes que um usuário pode acessar baseado em sua hierarquia e vínculos
CREATE OR REPLACE FUNCTION public.get_clientes_acessiveis(_user_id UUID)
RETURNS TABLE(cliente_id UUID)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel_hierarquico INTEGER;
  v_equipe_id UUID;
  v_is_gestor_equipe BOOLEAN;
BEGIN
  -- Obter nível hierárquico do usuário
  v_nivel_hierarquico := public.get_nivel_hierarquico(_user_id);
  
  -- Se não tem nível (sem role), retornar vazio
  IF v_nivel_hierarquico IS NULL THEN
    RETURN;
  END IF;

  -- Verificar se é gestor de equipe
  v_is_gestor_equipe := public.has_role(_user_id, 'gestor_equipe'::app_role);
  
  -- Obter equipe do usuário
  SELECT me.equipe_id INTO v_equipe_id
  FROM public.membros_equipe me
  WHERE me.usuario_id = _user_id
  LIMIT 1;

  -- CASO 1: Admin ou níveis hierárquicos altos (diretor, gerente, coordenador)
  -- Acessa TODOS os clientes
  IF v_nivel_hierarquico <= 3 THEN
    RETURN QUERY
    SELECT c.id FROM public.clientes c WHERE c.excluido_em IS NULL;
    RETURN;
  END IF;

  -- CASO 2: Gestor de Equipe
  -- Acessa clientes da equipe que ele é gestor
  IF v_is_gestor_equipe THEN
    RETURN QUERY
    SELECT DISTINCT c.id
    FROM public.clientes c
    WHERE c.excluido_em IS NULL
    AND (
      -- Clientes da equipe
      c.equipe_id IN (
        SELECT e.id FROM public.equipes e 
        WHERE e.gestor_id = _user_id AND e.esta_ativa = true
      )
      -- OU clientes vinculados diretamente ao gestor
      OR EXISTS (
        SELECT 1 FROM public.usuario_clientes_vinculo ucv
        WHERE ucv.usuario_id = _user_id 
          AND ucv.cliente_id = c.id
          AND ucv.ativo = true
          AND (ucv.data_fim IS NULL OR ucv.data_fim >= CURRENT_DATE)
      )
    );
    RETURN;
  END IF;

  -- CASO 3: Representante Comercial / Executivo de Contas / Vendedor
  -- Acessa apenas clientes vinculados diretamente
  IF public.has_any_role(_user_id, ARRAY[
    'representante_comercial'::app_role,
    'executivo_contas'::app_role,
    'sales'::app_role
  ]) THEN
    RETURN QUERY
    SELECT DISTINCT c.id
    FROM public.clientes c
    WHERE c.excluido_em IS NULL
    AND (
      -- Vinculado diretamente via usuario_clientes_vinculo
      EXISTS (
        SELECT 1 FROM public.usuario_clientes_vinculo ucv
        WHERE ucv.usuario_id = _user_id 
          AND ucv.cliente_id = c.id
          AND ucv.ativo = true
          AND (ucv.data_fim IS NULL OR ucv.data_fim >= CURRENT_DATE)
      )
      -- OU é o vendedor do cliente (campo legado)
      OR c.vendedor_id = _user_id
    );
    RETURN;
  END IF;

  -- CASO 4: Consultor de Vendas
  -- Acessa clientes da equipe
  IF public.has_role(_user_id, 'consultor_vendas'::app_role) AND v_equipe_id IS NOT NULL THEN
    RETURN QUERY
    SELECT DISTINCT c.id
    FROM public.clientes c
    WHERE c.excluido_em IS NULL
      AND c.equipe_id = v_equipe_id;
    RETURN;
  END IF;

  -- CASO 5: Backoffice
  -- Acessa clientes do vendedor vinculado
  IF public.has_role(_user_id, 'backoffice'::app_role) THEN
    RETURN QUERY
    SELECT DISTINCT c.id
    FROM public.clientes c
    WHERE c.excluido_em IS NULL
    AND c.vendedor_id IN (
      SELECT ur.vendedor_vinculado_id 
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id 
        AND ur.vendedor_vinculado_id IS NOT NULL
    );
    RETURN;
  END IF;

  -- Caso padrão: nenhum cliente
  RETURN;
END;
$$;

-- 3. FUNÇÃO: OBTER VENDAS ACESSÍVEIS
-- Similar à função de clientes, mas para vendas
CREATE OR REPLACE FUNCTION public.get_vendas_acessiveis(_user_id UUID)
RETURNS TABLE(venda_id UUID)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel_hierarquico INTEGER;
  v_equipe_id UUID;
  v_is_gestor_equipe BOOLEAN;
BEGIN
  v_nivel_hierarquico := public.get_nivel_hierarquico(_user_id);
  
  IF v_nivel_hierarquico IS NULL THEN
    RETURN;
  END IF;

  v_is_gestor_equipe := public.has_role(_user_id, 'gestor_equipe'::app_role);
  
  SELECT me.equipe_id INTO v_equipe_id
  FROM public.membros_equipe me
  WHERE me.usuario_id = _user_id
  LIMIT 1;

  -- CASO 1: Admin ou hierarquia alta - acessa todas
  IF v_nivel_hierarquico <= 3 THEN
    RETURN QUERY SELECT v.id FROM public.vendas v;
    RETURN;
  END IF;

  -- CASO 2: Gestor de Equipe - acessa vendas da equipe
  IF v_is_gestor_equipe THEN
    RETURN QUERY
    SELECT v.id FROM public.vendas v
    WHERE v.equipe_id IN (
      SELECT e.id FROM public.equipes e 
      WHERE e.gestor_id = _user_id AND e.esta_ativa = true
    )
    OR v.vendedor_id = _user_id
    OR v.responsavel_id = _user_id;
    RETURN;
  END IF;

  -- CASO 3: Vendedores - acessa suas próprias vendas
  IF public.has_any_role(_user_id, ARRAY[
    'representante_comercial'::app_role,
    'executivo_contas'::app_role,
    'sales'::app_role
  ]) THEN
    RETURN QUERY
    SELECT v.id FROM public.vendas v
    WHERE v.vendedor_id = _user_id 
       OR v.responsavel_id = _user_id
       OR v.user_id = _user_id;
    RETURN;
  END IF;

  -- CASO 4: Backoffice - acessa vendas do vendedor vinculado
  IF public.has_role(_user_id, 'backoffice'::app_role) THEN
    RETURN QUERY
    SELECT v.id FROM public.vendas v
    WHERE v.vendedor_id IN (
      SELECT ur.vendedor_vinculado_id 
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id 
        AND ur.vendedor_vinculado_id IS NOT NULL
    );
    RETURN;
  END IF;

  RETURN;
END;
$$;

-- 4. FUNÇÃO: VERIFICAR SE USUÁRIO PODE ACESSAR CLIENTE ESPECÍFICO
CREATE OR REPLACE FUNCTION public.pode_acessar_cliente(_user_id UUID, _cliente_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_clientes_acessiveis(_user_id) ca
    WHERE ca.cliente_id = _cliente_id
  );
$$;

-- 5. FUNÇÃO: VERIFICAR SE USUÁRIO PODE ACESSAR VENDA ESPECÍFICA
CREATE OR REPLACE FUNCTION public.pode_acessar_venda(_user_id UUID, _venda_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_vendas_acessiveis(_user_id) va
    WHERE va.venda_id = _venda_id
  );
$$;

-- 6. FUNÇÃO: OBTER EQUIPES GERENCIADAS POR UM USUÁRIO
CREATE OR REPLACE FUNCTION public.get_equipes_gerenciadas(_user_id UUID)
RETURNS TABLE(equipe_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.equipes e
  WHERE e.esta_ativa = true
    AND (
      e.gestor_id = _user_id 
      OR e.lider_equipe_id = _user_id
      OR public.has_any_role(_user_id, ARRAY[
        'admin'::app_role, 
        'diretor_comercial'::app_role,
        'gerente_comercial'::app_role,
        'coordenador_comercial'::app_role,
        'manager'::app_role
      ])
    );
$$;

-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON FUNCTION public.get_usuarios_subordinados IS 
  'Retorna todos os subordinados (diretos e indiretos) de um usuário, com o nível de distância na hierarquia';

COMMENT ON FUNCTION public.get_clientes_acessiveis IS 
  'Retorna todos os clientes que um usuário pode acessar baseado em sua hierarquia, vínculos e equipe';

COMMENT ON FUNCTION public.get_vendas_acessiveis IS 
  'Retorna todas as vendas que um usuário pode acessar baseado em sua hierarquia e vínculos';

COMMENT ON FUNCTION public.pode_acessar_cliente IS 
  'Verifica se um usuário específico pode acessar um cliente específico';

COMMENT ON FUNCTION public.pode_acessar_venda IS 
  'Verifica se um usuário específico pode acessar uma venda específica';

COMMENT ON FUNCTION public.get_equipes_gerenciadas IS 
  'Retorna as equipes que um usuário gerencia (como gestor ou líder)';