-- Corrigir função get_clientes_acessiveis removendo referências a coluna inexistente
CREATE OR REPLACE FUNCTION public.get_clientes_acessiveis(_user_id uuid)
RETURNS TABLE(cliente_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    AND me.esta_ativo = true
  LIMIT 1;

  -- CASO 1: Admin ou níveis hierárquicos altos (diretor, gerente, coordenador)
  -- Acessa TODOS os clientes
  IF v_nivel_hierarquico <= 3 THEN
    RETURN QUERY
    SELECT c.id FROM public.clientes c;
    RETURN;
  END IF;

  -- CASO 2: Gestor de Equipe
  -- Acessa clientes da equipe que ele é gestor
  IF v_is_gestor_equipe THEN
    RETURN QUERY
    SELECT DISTINCT c.id
    FROM public.clientes c
    WHERE (
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
    WHERE (
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
    WHERE c.equipe_id = v_equipe_id;
    RETURN;
  END IF;

  -- CASO 5: Backoffice
  -- Acessa clientes do vendedor vinculado
  IF public.has_role(_user_id, 'backoffice'::app_role) THEN
    RETURN QUERY
    SELECT DISTINCT c.id
    FROM public.clientes c
    WHERE c.vendedor_id IN (
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

COMMENT ON FUNCTION public.get_clientes_acessiveis IS 
'Retorna IDs dos clientes que um usuário pode acessar baseado em sua role e hierarquia. Admin vê todos, vendedores veem seus clientes, etc.';