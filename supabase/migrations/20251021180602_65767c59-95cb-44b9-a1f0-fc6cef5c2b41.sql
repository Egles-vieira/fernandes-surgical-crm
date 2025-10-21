-- Corrigir search_path das funções de tickets
CREATE OR REPLACE FUNCTION gerar_numero_ticket()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  mes TEXT;
  contador INTEGER;
  numero TEXT;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YY');
  mes := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket FROM 8) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.tickets
  WHERE numero_ticket LIKE 'TK' || ano || mes || '%';
  
  numero := 'TK' || ano || mes || LPAD(contador::TEXT, 4, '0');
  RETURN numero;
END;
$$;

CREATE OR REPLACE FUNCTION set_numero_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_ticket IS NULL THEN
    NEW.numero_ticket := gerar_numero_ticket();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION atualizar_total_interacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
  SET total_interacoes = total_interacoes + 1
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;