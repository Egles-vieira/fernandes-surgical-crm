-- Corrigir search_path da função criada na migration anterior
CREATE OR REPLACE FUNCTION atualizar_score_ajuste_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;