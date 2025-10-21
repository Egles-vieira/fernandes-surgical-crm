-- Adicionar campos de controle de tempo e pausa na tabela tickets
ALTER TABLE public.tickets
ADD COLUMN tempo_pausado_horas INTEGER DEFAULT 0,
ADD COLUMN pausado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN esta_pausado BOOLEAN DEFAULT false,
ADD COLUMN motivo_pausa TEXT;

-- Criar tabela para histórico de pausas
CREATE TABLE public.tickets_pausas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  pausado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retomado_em TIMESTAMP WITH TIME ZONE,
  duracao_horas INTEGER,
  motivo TEXT,
  pausado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de pausas
ALTER TABLE public.tickets_pausas ENABLE ROW LEVEL SECURITY;

-- Policy para visualizar pausas
CREATE POLICY "Usuários podem visualizar pausas de tickets"
ON public.tickets_pausas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = tickets_pausas.ticket_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
      OR tickets.aberto_por = auth.uid()
      OR tickets.atribuido_para = auth.uid()
    )
  )
);

-- Policy para criar pausas
CREATE POLICY "Usuários podem criar pausas"
ON public.tickets_pausas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = tickets_pausas.ticket_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
      OR tickets.atribuido_para = auth.uid()
    )
  )
);

-- Policy para atualizar pausas (retomar)
CREATE POLICY "Usuários podem atualizar pausas"
ON public.tickets_pausas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = tickets_pausas.ticket_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
      OR tickets.atribuido_para = auth.uid()
    )
  )
);

-- Função para calcular tempo efetivo em aberto
CREATE OR REPLACE FUNCTION public.calcular_tempo_efetivo_ticket(ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ticket_data RECORD;
  tempo_total_horas INTEGER;
  tempo_pausado INTEGER;
  tempo_efetivo INTEGER;
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
  
  -- Calcular tempo total desde abertura
  IF ticket_data.fechado_em IS NOT NULL THEN
    tempo_total_horas := EXTRACT(EPOCH FROM (ticket_data.fechado_em - ticket_data.data_abertura)) / 3600;
  ELSIF ticket_data.resolvido_em IS NOT NULL THEN
    tempo_total_horas := EXTRACT(EPOCH FROM (ticket_data.resolvido_em - ticket_data.data_abertura)) / 3600;
  ELSE
    tempo_total_horas := EXTRACT(EPOCH FROM (now() - ticket_data.data_abertura)) / 3600;
  END IF;
  
  -- Pegar tempo pausado já registrado
  tempo_pausado := COALESCE(ticket_data.tempo_pausado_horas, 0);
  
  -- Se está pausado agora, adicionar tempo da pausa atual
  IF ticket_data.esta_pausado AND ticket_data.pausado_em IS NOT NULL THEN
    tempo_pausado := tempo_pausado + EXTRACT(EPOCH FROM (now() - ticket_data.pausado_em)) / 3600;
  END IF;
  
  -- Calcular tempo efetivo
  tempo_efetivo := tempo_total_horas - tempo_pausado;
  
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

-- Trigger para atualizar tempo pausado quando retomar
CREATE OR REPLACE FUNCTION public.atualizar_tempo_pausado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  duracao INTEGER;
BEGIN
  -- Quando retomar a pausa
  IF NEW.retomado_em IS NOT NULL AND OLD.retomado_em IS NULL THEN
    -- Calcular duração da pausa
    duracao := EXTRACT(EPOCH FROM (NEW.retomado_em - NEW.pausado_em)) / 3600;
    NEW.duracao_horas := duracao;
    
    -- Atualizar ticket
    UPDATE public.tickets
    SET 
      tempo_pausado_horas = COALESCE(tempo_pausado_horas, 0) + duracao,
      esta_pausado = false,
      pausado_em = NULL,
      motivo_pausa = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_tempo_pausado
BEFORE UPDATE ON public.tickets_pausas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_tempo_pausado();

-- Comentários
COMMENT ON TABLE public.tickets_pausas IS 'Histórico de pausas dos tickets de SAC';
COMMENT ON FUNCTION public.calcular_tempo_efetivo_ticket IS 'Calcula o tempo efetivo de um ticket descontando pausas';