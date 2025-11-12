-- 1) Reforça a função can_access_cliente_por_cgc com normalização e SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.can_access_cliente_por_cgc(_user_id uuid, _cgc text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cgc_clean text := regexp_replace(COALESCE(_cgc, ''), '\\D', '', 'g');
  v_cli record;
  v_lvl int;
  v_linked uuid;
BEGIN
  IF v_cgc_clean = '' THEN
    RETURN false;
  END IF;

  -- Busca cliente pelo CNPJ/CPF normalizado
  SELECT id, vendedor_id, equipe_id
  INTO v_cli
  FROM public.clientes
  WHERE regexp_replace(COALESCE(cgc, ''), '\\D', '', 'g') = v_cgc_clean
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Admin sempre pode
  IF public.has_role(_user_id, 'admin'::public.app_role) THEN
    RETURN true;
  END IF;

  -- Dono do cliente
  IF v_cli.vendedor_id = _user_id THEN
    RETURN true;
  END IF;

  -- Hierarquia alta (nível 1-3)
  BEGIN
    v_lvl := public.get_nivel_hierarquico(_user_id);
  EXCEPTION WHEN undefined_function THEN
    v_lvl := NULL; -- Caso função não exista no ambiente
  END;
  IF v_lvl IS NOT NULL AND v_lvl <= 3 THEN
    RETURN true;
  END IF;

  -- Líder da equipe do cliente
  IF v_cli.equipe_id IS NOT NULL AND public.is_team_leader(_user_id, v_cli.equipe_id) THEN
    RETURN true;
  END IF;

  -- Backoffice vinculado a um vendedor
  BEGIN
    v_linked := public.get_linked_seller(_user_id);
  EXCEPTION WHEN undefined_function THEN
    v_linked := NULL;
  END;
  IF v_linked IS NOT NULL AND v_cli.vendedor_id = v_linked THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2) Recria a policy de INSERT de vendas para o papel 'authenticated'
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;
CREATE POLICY "Criar vendas - hierarquia + admin + backoffice"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.get_nivel_hierarquico(auth.uid()) IS NOT NULL
    AND public.get_nivel_hierarquico(auth.uid()) <= 3
  )
  OR public.can_access_cliente_por_cgc(auth.uid(), cliente_cnpj)
);

-- 3) Garante que o trigger de defaults existe e roda ANTES do INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_set_venda_defaults'
  ) THEN
    CREATE TRIGGER trg_set_venda_defaults
    BEFORE INSERT ON public.vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_venda_defaults();
  END IF;
END $$;