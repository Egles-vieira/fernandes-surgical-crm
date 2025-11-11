-- Define defaults for vendas to satisfy RLS and not-null requirements
CREATE OR REPLACE FUNCTION public.set_venda_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Garantir que user_id seja o usuário autenticado quando não informado
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Garantir que vendedor_id seja o usuário autenticado quando não informado
  IF NEW.vendedor_id IS NULL THEN
    NEW.vendedor_id := auth.uid();
  END IF;

  -- Gerar numero_venda se não vier do frontend
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

-- Criar trigger BEFORE INSERT para aplicar os defaults acima
DROP TRIGGER IF EXISTS trg_set_venda_defaults ON public.vendas;
CREATE TRIGGER trg_set_venda_defaults
BEFORE INSERT ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.set_venda_defaults();