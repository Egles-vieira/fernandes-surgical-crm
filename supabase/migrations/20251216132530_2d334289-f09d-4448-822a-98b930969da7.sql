-- Função para normalizar número de telefone (remove tudo exceto dígitos)
CREATE OR REPLACE FUNCTION public.normalizar_telefone(telefone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF telefone IS NULL OR telefone = '' THEN
    RETURN NULL;
  END IF;
  -- Remove tudo exceto dígitos
  RETURN regexp_replace(telefone, '[^0-9]', '', 'g');
END;
$$;

-- Função para buscar contato CRM por telefone normalizado
CREATE OR REPLACE FUNCTION public.buscar_contato_crm_por_telefone(numero_whatsapp TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contato_encontrado_id UUID;
  numero_limpo TEXT;
BEGIN
  IF numero_whatsapp IS NULL OR numero_whatsapp = '' THEN
    RETURN NULL;
  END IF;
  
  numero_limpo := normalizar_telefone(numero_whatsapp);
  
  IF numero_limpo IS NULL OR numero_limpo = '' THEN
    RETURN NULL;
  END IF;
  
  -- Busca contato onde o número normalizado corresponde a telefone, celular ou whatsapp_numero
  SELECT id INTO contato_encontrado_id
  FROM contatos
  WHERE esta_ativo = true
    AND excluido_em IS NULL
    AND (
      -- Match exato
      normalizar_telefone(telefone) = numero_limpo
      OR normalizar_telefone(celular) = numero_limpo
      OR normalizar_telefone(whatsapp_numero) = numero_limpo
      -- Match parcial (número sem código país vs com código)
      OR normalizar_telefone(telefone) LIKE '%' || RIGHT(numero_limpo, 11)
      OR normalizar_telefone(celular) LIKE '%' || RIGHT(numero_limpo, 11)
      OR normalizar_telefone(whatsapp_numero) LIKE '%' || RIGHT(numero_limpo, 11)
      OR numero_limpo LIKE '%' || RIGHT(normalizar_telefone(telefone), 11)
      OR numero_limpo LIKE '%' || RIGHT(normalizar_telefone(celular), 11)
      OR numero_limpo LIKE '%' || RIGHT(normalizar_telefone(whatsapp_numero), 11)
    )
  ORDER BY 
    -- Prioriza match exato
    CASE 
      WHEN normalizar_telefone(whatsapp_numero) = numero_limpo THEN 1
      WHEN normalizar_telefone(celular) = numero_limpo THEN 2
      WHEN normalizar_telefone(telefone) = numero_limpo THEN 3
      ELSE 4
    END,
    criado_em DESC
  LIMIT 1;
  
  RETURN contato_encontrado_id;
END;
$$;

-- Trigger function para vincular automaticamente contato WhatsApp ao CRM
CREATE OR REPLACE FUNCTION public.vincular_contato_whatsapp_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contato_crm_id UUID;
  cliente_vinculado_id UUID;
BEGIN
  -- Só executa se contato_id ainda não estiver preenchido
  IF NEW.contato_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Busca contato CRM pelo número
  contato_crm_id := buscar_contato_crm_por_telefone(NEW.numero_whatsapp);
  
  IF contato_crm_id IS NOT NULL THEN
    NEW.contato_id := contato_crm_id;
    
    -- Se o contato CRM tem cliente_id, busca para classificação
    SELECT cliente_id INTO cliente_vinculado_id
    FROM contatos
    WHERE id = contato_crm_id;
    
    -- Log da vinculação (opcional - pode ser removido em produção)
    RAISE NOTICE 'WhatsApp contato % vinculado ao CRM contato %', NEW.numero_whatsapp, contato_crm_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela whatsapp_contatos
DROP TRIGGER IF EXISTS trg_vincular_contato_whatsapp_crm ON whatsapp_contatos;
CREATE TRIGGER trg_vincular_contato_whatsapp_crm
  BEFORE INSERT ON whatsapp_contatos
  FOR EACH ROW
  EXECUTE FUNCTION vincular_contato_whatsapp_crm();

-- Criar índices para otimizar buscas por telefone normalizado
CREATE INDEX IF NOT EXISTS idx_contatos_telefone_normalizado 
ON contatos (normalizar_telefone(telefone)) 
WHERE esta_ativo = true AND excluido_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_contatos_celular_normalizado 
ON contatos (normalizar_telefone(celular)) 
WHERE esta_ativo = true AND excluido_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_contatos_whatsapp_normalizado 
ON contatos (normalizar_telefone(whatsapp_numero)) 
WHERE esta_ativo = true AND excluido_em IS NULL;