-- Sequence para número da oportunidade
CREATE SEQUENCE IF NOT EXISTS oportunidade_codigo_seq START 1;

-- Trigger para gerar código sequencial
CREATE OR REPLACE FUNCTION gerar_codigo_oportunidade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'OPP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('oportunidade_codigo_seq')::TEXT, 5, '0');
  END IF;
  
  -- Definir proprietario_id se não vier
  IF NEW.proprietario_id IS NULL THEN
    NEW.proprietario_id := auth.uid();
  END IF;
  
  -- Definir criado_por se não vier
  IF NEW.criado_por IS NULL THEN
    NEW.criado_por := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger (remover se existir antes)
DROP TRIGGER IF EXISTS trg_gerar_codigo_oportunidade ON oportunidades;

CREATE TRIGGER trg_gerar_codigo_oportunidade
  BEFORE INSERT ON oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION gerar_codigo_oportunidade();