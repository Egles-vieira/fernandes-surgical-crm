-- Corrigir função de cálculo de tempo para usar NUMERIC em vez de INTEGER
CREATE OR REPLACE FUNCTION public.calcular_tempo_efetivo_ticket(ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ticket_data RECORD;
  tempo_total_horas NUMERIC;
  tempo_pausado NUMERIC;
  tempo_efetivo NUMERIC;
  result JSONB;
BEGIN
  -- Buscar dados do ticket
  SELECT 
    data_abertura,
    resolvido_em,
    fechado_em,
    tempo_pausado_horas,
    esta_pausado,
    pausado_em
  INTO ticket_data
  FROM public.tickets
  WHERE id = ticket_id;
  
  -- Calcular tempo total desde abertura em horas (com precisão decimal)
  IF ticket_data.fechado_em IS NOT NULL THEN
    tempo_total_horas := EXTRACT(EPOCH FROM (ticket_data.fechado_em - ticket_data.data_abertura))::NUMERIC / 3600;
  ELSIF ticket_data.resolvido_em IS NOT NULL THEN
    tempo_total_horas := EXTRACT(EPOCH FROM (ticket_data.resolvido_em - ticket_data.data_abertura))::NUMERIC / 3600;
  ELSE
    tempo_total_horas := EXTRACT(EPOCH FROM (now() - ticket_data.data_abertura))::NUMERIC / 3600;
  END IF;
  
  -- Pegar tempo pausado já registrado (converter de INTEGER para NUMERIC)
  tempo_pausado := COALESCE(ticket_data.tempo_pausado_horas::NUMERIC, 0);
  
  -- Se está pausado agora, adicionar tempo da pausa atual
  IF ticket_data.esta_pausado AND ticket_data.pausado_em IS NOT NULL THEN
    tempo_pausado := tempo_pausado + (EXTRACT(EPOCH FROM (now() - ticket_data.pausado_em))::NUMERIC / 3600);
  END IF;
  
  -- Calcular tempo efetivo
  tempo_efetivo := tempo_total_horas - tempo_pausado;
  
  -- Garantir que não seja negativo
  IF tempo_efetivo < 0 THEN
    tempo_efetivo := 0;
  END IF;
  
  -- Montar resultado
  result := jsonb_build_object(
    'tempo_total_horas', tempo_total_horas,
    'tempo_pausado_horas', tempo_pausado,
    'tempo_efetivo_horas', tempo_efetivo,
    'esta_pausado', ticket_data.esta_pausado
  );
  
  RETURN result;
END;
$$;