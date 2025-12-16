-- Criar índice funcional para busca por número normalizado
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_numero_normalizado 
ON whatsapp_contatos (REGEXP_REPLACE(numero_whatsapp, '[^0-9]', '', 'g'));

-- Atualizar função buscar_operador_carteira para buscar por número normalizado
CREATE OR REPLACE FUNCTION public.buscar_operador_carteira(p_contato_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_operador_id UUID;
  v_numero_normalizado TEXT;
BEGIN
  -- Buscar o número normalizado do contato
  SELECT REGEXP_REPLACE(numero_whatsapp, '[^0-9]', '', 'g')
  INTO v_numero_normalizado
  FROM whatsapp_contatos
  WHERE id = p_contato_id;
  
  -- Se não encontrou o contato, retorna NULL
  IF v_numero_normalizado IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar carteira por qualquer contato com esse número normalizado
  SELECT c.operador_id INTO v_operador_id
  FROM whatsapp_carteiras_v2 c
  JOIN whatsapp_carteiras_contatos cc ON cc.carteira_id = c.id
  JOIN whatsapp_contatos wc ON wc.id = cc.whatsapp_contato_id
  WHERE REGEXP_REPLACE(wc.numero_whatsapp, '[^0-9]', '', 'g') = v_numero_normalizado
    AND c.esta_ativa = true
  LIMIT 1;
  
  RETURN v_operador_id;
END;
$$;