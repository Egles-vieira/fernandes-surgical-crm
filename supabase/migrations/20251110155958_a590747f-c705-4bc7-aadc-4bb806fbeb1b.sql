-- Criar política de auto-inserção para vendedor, se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vendas' AND policyname = 'Vendedor cria venda própria'
  ) THEN
    CREATE POLICY "Vendedor cria venda própria"
    ON public.vendas
    FOR INSERT
    TO authenticated
    WITH CHECK (vendedor_id = auth.uid());
  END IF;
END $$;

-- Garantir que administradores consigam visualizar todas as vendas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vendas' AND policyname = 'Admin pode visualizar todas vendas'
  ) THEN
    CREATE POLICY "Admin pode visualizar todas vendas"
    ON public.vendas
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;