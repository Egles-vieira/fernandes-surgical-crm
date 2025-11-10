-- Melhorar o trigger para buscar automaticamente a equipe do vendedor se equipe_id for NULL
CREATE OR REPLACE FUNCTION public.atualizar_meta_vendas_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _meta RECORD;
  _equipe_id UUID;
BEGIN
  -- Apenas processar se a venda foi efetivamente aprovada
  IF NEW.aprovado_em IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se equipe_id for NULL, tentar buscar da equipe do vendedor
  _equipe_id := NEW.equipe_id;
  IF _equipe_id IS NULL AND NEW.vendedor_id IS NOT NULL THEN
    SELECT equipe_id INTO _equipe_id
    FROM membros_equipe me
    INNER JOIN equipes e ON e.id = me.equipe_id
    WHERE me.usuario_id = NEW.vendedor_id
      AND me.esta_ativo = true
      AND e.esta_ativa = true
    LIMIT 1;
    
    -- Atualizar a venda com a equipe encontrada
    IF _equipe_id IS NOT NULL THEN
      NEW.equipe_id := _equipe_id;
    END IF;
  END IF;
  
  -- Se ainda não tiver equipe, não processar
  IF _equipe_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar metas de vendas ativas da equipe que incluem essa venda no período
  FOR _meta IN 
    SELECT id
    FROM metas_equipe
    WHERE tipo_meta = 'vendas'
      AND status = 'ativa'
      AND equipe_id = _equipe_id
      AND NEW.aprovado_em >= periodo_inicio
      AND NEW.aprovado_em <= periodo_fim
  LOOP
    -- Recalcular valor da meta
    PERFORM recalcular_valor_meta_vendas(_meta.id);
  END LOOP;
  
  RETURN NEW;
END;
$$;