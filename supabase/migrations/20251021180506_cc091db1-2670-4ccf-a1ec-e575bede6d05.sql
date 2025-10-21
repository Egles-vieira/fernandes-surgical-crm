-- Criar enum para status de ticket
CREATE TYPE status_ticket AS ENUM ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado', 'cancelado');

-- Criar enum para prioridade de ticket
CREATE TYPE prioridade_ticket AS ENUM ('baixa', 'normal', 'alta', 'urgente');

-- Criar enum para tipo de ticket
CREATE TYPE tipo_ticket AS ENUM ('reclamacao', 'duvida', 'sugestao', 'elogio', 'garantia', 'troca', 'devolucao');

-- Criar tabela de tickets
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_ticket TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo tipo_ticket NOT NULL DEFAULT 'reclamacao',
  status status_ticket NOT NULL DEFAULT 'aberto',
  prioridade prioridade_ticket NOT NULL DEFAULT 'normal',
  
  -- Relacionamentos
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT,
  cliente_telefone TEXT,
  
  -- Atribuição
  aberto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atribuido_para UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atribuido_em TIMESTAMP WITH TIME ZONE,
  
  -- Prazos e datas
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prazo_resposta TIMESTAMP WITH TIME ZONE,
  prazo_resolucao TIMESTAMP WITH TIME ZONE,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  fechado_em TIMESTAMP WITH TIME ZONE,
  
  -- Métricas
  tempo_primeira_resposta_horas INTEGER,
  tempo_resolucao_horas INTEGER,
  total_interacoes INTEGER DEFAULT 0,
  
  -- Avaliação
  avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
  comentario_avaliacao TEXT,
  avaliado_em TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  tags TEXT[],
  anexos JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de interações/histórico do ticket
CREATE TABLE public.tickets_interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  
  tipo_interacao TEXT NOT NULL, -- 'comentario', 'status_mudou', 'atribuicao_mudou', 'prioridade_mudou', 'anexo_adicionado', etc
  
  -- Conteúdo
  mensagem TEXT,
  mensagem_interna BOOLEAN DEFAULT false, -- Se true, não é visível para o cliente
  
  -- Mudanças de estado
  valor_anterior TEXT,
  valor_novo TEXT,
  
  -- Autor
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_autor TEXT,
  
  -- Anexos
  anexos JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Função para gerar número de ticket
CREATE OR REPLACE FUNCTION gerar_numero_ticket()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  ano TEXT;
  mes TEXT;
  contador INTEGER;
  numero TEXT;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YY');
  mes := TO_CHAR(CURRENT_DATE, 'MM');
  
  -- Buscar próximo contador do mês
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket FROM 8) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.tickets
  WHERE numero_ticket LIKE 'TK' || ano || mes || '%';
  
  numero := 'TK' || ano || mes || LPAD(contador::TEXT, 4, '0');
  RETURN numero;
END;
$$;

-- Trigger para gerar número do ticket automaticamente
CREATE OR REPLACE FUNCTION set_numero_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_ticket IS NULL THEN
    NEW.numero_ticket := gerar_numero_ticket();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_numero_ticket
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION set_numero_ticket();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION update_tickets_updated_at();

-- Trigger para registrar mudanças no histórico
CREATE OR REPLACE FUNCTION registrar_mudanca_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nome_usuario TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT COALESCE(primeiro_nome || ' ' || sobrenome, primeiro_nome, 'Sistema')
  INTO nome_usuario
  FROM public.perfis_usuario
  WHERE id = auth.uid();
  
  -- Registrar mudança de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.tickets_interacoes (ticket_id, tipo_interacao, valor_anterior, valor_novo, criado_por, nome_autor, mensagem_interna)
    VALUES (NEW.id, 'status_mudou', OLD.status::TEXT, NEW.status::TEXT, auth.uid(), nome_usuario, true);
  END IF;
  
  -- Registrar mudança de prioridade
  IF OLD.prioridade IS DISTINCT FROM NEW.prioridade THEN
    INSERT INTO public.tickets_interacoes (ticket_id, tipo_interacao, valor_anterior, valor_novo, criado_por, nome_autor, mensagem_interna)
    VALUES (NEW.id, 'prioridade_mudou', OLD.prioridade::TEXT, NEW.prioridade::TEXT, auth.uid(), nome_usuario, true);
  END IF;
  
  -- Registrar mudança de atribuição
  IF OLD.atribuido_para IS DISTINCT FROM NEW.atribuido_para THEN
    INSERT INTO public.tickets_interacoes (ticket_id, tipo_interacao, valor_anterior, valor_novo, criado_por, nome_autor, mensagem_interna)
    VALUES (NEW.id, 'atribuicao_mudou', OLD.atribuido_para::TEXT, NEW.atribuido_para::TEXT, auth.uid(), nome_usuario, true);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_registrar_mudanca_ticket
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION registrar_mudanca_ticket();

-- Trigger para atualizar contador de interações
CREATE OR REPLACE FUNCTION atualizar_total_interacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tickets
  SET total_interacoes = total_interacoes + 1
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_total_interacoes
AFTER INSERT ON public.tickets_interacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_total_interacoes();

-- Habilitar RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets_interacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tickets
CREATE POLICY "Usuários podem visualizar tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
  OR aberto_por = auth.uid()
  OR atribuido_para = auth.uid()
);

CREATE POLICY "Sales podem criar tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
);

CREATE POLICY "Usuários podem atualizar tickets atribuídos ou próprios"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  OR aberto_por = auth.uid()
  OR atribuido_para = auth.uid()
);

CREATE POLICY "Admins podem deletar tickets"
ON public.tickets FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para interações
CREATE POLICY "Usuários podem visualizar interações de seus tickets"
ON public.tickets_interacoes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = tickets_interacoes.ticket_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
      OR tickets.aberto_por = auth.uid()
      OR tickets.atribuido_para = auth.uid()
    )
  )
);

CREATE POLICY "Usuários podem criar interações em seus tickets"
ON public.tickets_interacoes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = tickets_interacoes.ticket_id
    AND (
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales'::app_role])
      OR tickets.aberto_por = auth.uid()
      OR tickets.atribuido_para = auth.uid()
    )
  )
);

-- Criar índices para performance
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_prioridade ON public.tickets(prioridade);
CREATE INDEX idx_tickets_atribuido_para ON public.tickets(atribuido_para);
CREATE INDEX idx_tickets_venda_id ON public.tickets(venda_id);
CREATE INDEX idx_tickets_produto_id ON public.tickets(produto_id);
CREATE INDEX idx_tickets_data_abertura ON public.tickets(data_abertura DESC);
CREATE INDEX idx_tickets_interacoes_ticket_id ON public.tickets_interacoes(ticket_id, created_at DESC);