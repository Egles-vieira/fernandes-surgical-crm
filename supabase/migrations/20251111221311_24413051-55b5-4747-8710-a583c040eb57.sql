-- 1) Função para checar acesso ao cliente por CNPJ/CPF normalizado
CREATE OR REPLACE FUNCTION public.can_access_cliente_por_cgc(_user_id uuid, _cgc text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE regexp_replace(c.cgc, '[^0-9]', '', 'g') = regexp_replace(_cgc, '[^0-9]', '', 'g')
      AND public.can_access_cliente(_user_id, c.id)
  );
$$;

-- 2) Atualizar política de INSERT para vendedores, exigindo vínculo com o cliente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vendas' AND policyname = 'Vendedor cria venda própria'
  ) THEN
    EXECUTE 'DROP POLICY "Vendedor cria venda própria" ON public.vendas';
  END IF;
END$$;

CREATE POLICY "Vendedor cria venda própria"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  vendedor_id = auth.uid()
  AND public.can_access_cliente_por_cgc(auth.uid(), cliente_cnpj)
);

-- 3) Reforçar trigger de defaults: fixar vendedor_id conforme papéis
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

  -- Forçar vendedor_id para usuários não admin/manager; para admin/manager, se NULL, usar o próprio
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'manager'::public.app_role]) THEN
    NEW.vendedor_id := auth.uid();
  ELSIF NEW.vendedor_id IS NULL THEN
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

-- Observação: o trigger trg_set_venda_defaults já existe; a função acima foi atualizada e será utilizada automaticamente.