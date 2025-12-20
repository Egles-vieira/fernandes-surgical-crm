-- Adicionar coluna de validade da proposta
ALTER TABLE public.oportunidades 
ADD COLUMN validade_proposta DATE;

-- Atualizar oportunidades existentes com validade de 30 dias a partir da criação
UPDATE public.oportunidades 
SET validade_proposta = (criado_em::date + INTERVAL '30 days')::date
WHERE validade_proposta IS NULL;

-- Criar trigger para definir validade automaticamente ao criar nova oportunidade
CREATE OR REPLACE FUNCTION public.set_validade_proposta()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não foi informada uma validade, usar 30 dias a partir da data atual
  IF NEW.validade_proposta IS NULL THEN
    NEW.validade_proposta := (CURRENT_DATE + INTERVAL '30 days')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_validade_proposta ON public.oportunidades;
CREATE TRIGGER trigger_set_validade_proposta
  BEFORE INSERT ON public.oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION public.set_validade_proposta();