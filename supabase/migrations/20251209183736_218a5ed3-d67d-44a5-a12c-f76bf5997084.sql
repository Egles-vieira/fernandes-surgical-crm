
-- Corrige a função auth_check_vendas_access para incluir vendedor do cliente
CREATE OR REPLACE FUNCTION public.auth_check_vendas_access(
  _cliente_id uuid, 
  _vendedor_id uuid, 
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- É o vendedor/responsável da VENDA
    _vendedor_id = auth.uid() OR _user_id = auth.uid()
    -- OU é o vendedor do CLIENTE (REGRA PRINCIPAL!)
    OR EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = _cliente_id 
        AND c.vendedor_id = auth.uid()
    )
    -- OU tem hierarquia alta (admin, diretor, gerente)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      INNER JOIN public.role_hierarquia rh ON rh.role = ur.role
      WHERE ur.user_id = auth.uid() AND rh.nivel <= 3
    )
    -- OU é membro ativo da equipe do cliente
    OR EXISTS (
      SELECT 1 FROM public.clientes c
      INNER JOIN public.membros_equipe me ON me.equipe_id = c.equipe_id
      WHERE c.id = _cliente_id 
        AND me.usuario_id = auth.uid() 
        AND me.esta_ativo = true
    );
$$;

-- Corrige a política de UPDATE para incluir vendedor do cliente
DROP POLICY IF EXISTS vendas_update_v3 ON vendas;

CREATE POLICY vendas_update_v3 ON vendas
FOR UPDATE TO authenticated
USING (
  vendedor_id = auth.uid() 
  OR user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM clientes c WHERE c.id = cliente_id AND c.vendedor_id = auth.uid()
  )
  OR auth_check_high_hierarchy()
);

-- Também corrigir a política de DELETE se existir
DROP POLICY IF EXISTS vendas_delete_v3 ON vendas;

CREATE POLICY vendas_delete_v3 ON vendas
FOR DELETE TO authenticated
USING (
  vendedor_id = auth.uid() 
  OR user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM clientes c WHERE c.id = cliente_id AND c.vendedor_id = auth.uid()
  )
  OR auth_check_high_hierarchy()
);
