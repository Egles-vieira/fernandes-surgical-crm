-- Atualizar função can_access_cliente para validar dono sem depender do role 'sales'
CREATE OR REPLACE FUNCTION public.can_access_cliente(_user_id uuid, _cliente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_vendedor_id UUID;
    v_equipe_id UUID;
    v_is_admin BOOLEAN;
    v_is_lider BOOLEAN;
    v_is_backoffice BOOLEAN;
    v_user_equipe UUID;
    v_vendedor_vinculado UUID;
BEGIN
    SELECT vendedor_id, equipe_id INTO v_vendedor_id, v_equipe_id
    FROM clientes WHERE id = _cliente_id;
    
    -- Admin tem acesso total
    v_is_admin := has_role(_user_id, 'admin');
    IF v_is_admin THEN
        RETURN true;
    END IF;
    
    -- CRÍTICO: Dono do cliente tem acesso (sem depender de role)
    IF v_vendedor_id = _user_id THEN
        RETURN true;
    END IF;
    
    -- Líder de equipe tem acesso aos clientes da equipe
    v_is_lider := has_role(_user_id, 'lider');
    IF v_is_lider THEN
        v_user_equipe := get_user_team(_user_id);
        IF v_equipe_id = v_user_equipe OR is_team_leader(_user_id, v_equipe_id) THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Backoffice vinculado a um vendedor tem acesso aos clientes daquele vendedor
    v_is_backoffice := has_role(_user_id, 'backoffice');
    IF v_is_backoffice THEN
        v_vendedor_vinculado := get_linked_seller(_user_id);
        IF v_vendedor_id = v_vendedor_vinculado THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$;

-- Atualizar policy de INSERT em vendas para validar auth.uid() como dono
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;

CREATE POLICY "Criar vendas - hierarquia + admin + backoffice" ON public.vendas
FOR INSERT 
WITH CHECK (
  -- Admin pode criar qualquer venda
  has_role(auth.uid(), 'admin') 
  OR
  -- Níveis hierárquicos altos (1-3) podem criar qualquer venda
  (get_nivel_hierarquico(auth.uid()) IS NOT NULL AND get_nivel_hierarquico(auth.uid()) <= 3)
  OR
  -- Usuários podem criar vendas SOMENTE se forem donos do cliente
  -- (auth.uid() deve ter vínculo com cliente_cnpj)
  can_access_cliente_por_cgc(auth.uid(), cliente_cnpj)
);

-- Atualizar trigger para forçar vendedor_id = auth.uid() para todos, exceto admin
CREATE OR REPLACE FUNCTION public.set_venda_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- user_id padrão
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Forçar vendedor_id = auth.uid() para todos exceto admin
  -- Admin pode definir vendedor_id livremente; outros sempre usam o próprio ID
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    -- Admin pode escolher vendedor_id; se NULL, usa o próprio
    IF NEW.vendedor_id IS NULL THEN
      NEW.vendedor_id := auth.uid();
    END IF;
  ELSE
    -- Não-admin: sempre força vendedor_id = auth.uid()
    NEW.vendedor_id := auth.uid();
  END IF;

  -- Gerar número de venda se não vier
  IF NEW.numero_venda IS NULL OR NEW.numero_venda = '' THEN
    NEW.numero_venda := 'V' || to_char(now(), 'YYMMDDHH24MISSMS');
  END IF;

  -- Status padrão
  IF NEW.status IS NULL THEN
    NEW.status := 'rascunho';
  END IF;

  RETURN NEW;
END;
$$;