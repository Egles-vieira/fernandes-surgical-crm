-- FASE 3: Sistema de Metas por Equipe (Corrigido)

-- Tabela de metas de equipe
CREATE TABLE IF NOT EXISTS public.metas_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_meta TEXT NOT NULL CHECK (tipo_meta IN ('vendas', 'atendimentos', 'qualidade', 'produtividade', 'tickets_resolvidos', 'tempo_resposta', 'satisfacao_cliente', 'conversao')),
  metrica TEXT NOT NULL, -- ex: 'valor_total', 'quantidade', 'percentual', 'tempo_medio'
  valor_objetivo NUMERIC NOT NULL,
  valor_atual NUMERIC DEFAULT 0,
  unidade_medida TEXT, -- ex: 'R$', 'unidades', '%', 'horas'
  periodo_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  periodo_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada', 'pausada')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  alerta_percentual INTEGER DEFAULT 80, -- Alertar quando atingir X% do prazo sem atingir meta
  criado_por UUID REFERENCES public.perfis_usuario(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  concluido_em TIMESTAMP WITH TIME ZONE,
  cancelado_em TIMESTAMP WITH TIME ZONE,
  motivo_cancelamento TEXT,
  CONSTRAINT periodo_valido CHECK (periodo_fim > periodo_inicio)
);

-- Índices para performance
CREATE INDEX idx_metas_equipe_equipe_id ON public.metas_equipe(equipe_id);
CREATE INDEX idx_metas_equipe_status ON public.metas_equipe(status);
CREATE INDEX idx_metas_equipe_periodo ON public.metas_equipe(periodo_inicio, periodo_fim);
CREATE INDEX idx_metas_equipe_tipo ON public.metas_equipe(tipo_meta);

-- Tabela de histórico de progresso de metas (sem colunas GENERATED problemáticas)
CREATE TABLE IF NOT EXISTS public.progresso_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID NOT NULL REFERENCES public.metas_equipe(id) ON DELETE CASCADE,
  valor_anterior NUMERIC NOT NULL,
  valor_novo NUMERIC NOT NULL,
  diferenca NUMERIC,
  percentual_conclusao NUMERIC,
  origem TEXT, -- 'venda', 'ticket', 'manual', 'ajuste'
  referencia_id UUID, -- ID da venda ou ticket que gerou o progresso
  observacao TEXT,
  registrado_por UUID REFERENCES public.perfis_usuario(id),
  registrado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_progresso_metas_meta_id ON public.progresso_metas(meta_id);
CREATE INDEX idx_progresso_metas_origem ON public.progresso_metas(origem, referencia_id);
CREATE INDEX idx_progresso_metas_data ON public.progresso_metas(registrado_em DESC);

-- Trigger para calcular diferença e percentual no progresso_metas
CREATE OR REPLACE FUNCTION public.calcular_progresso_meta()
RETURNS TRIGGER AS $$
DECLARE
  _valor_objetivo NUMERIC;
BEGIN
  -- Calcular diferença
  NEW.diferenca := NEW.valor_novo - NEW.valor_anterior;
  
  -- Buscar valor objetivo e calcular percentual
  SELECT valor_objetivo INTO _valor_objetivo
  FROM public.metas_equipe
  WHERE id = NEW.meta_id;
  
  IF _valor_objetivo > 0 THEN
    NEW.percentual_conclusao := (NEW.valor_novo / _valor_objetivo * 100);
  ELSE
    NEW.percentual_conclusao := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_progresso_meta
  BEFORE INSERT ON public.progresso_metas
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_progresso_meta();

-- Tabela de alertas de metas
CREATE TABLE IF NOT EXISTS public.alertas_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID NOT NULL REFERENCES public.metas_equipe(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('prazo_proximo', 'meta_em_risco', 'meta_atingida', 'meta_superada', 'sem_progresso')),
  severidade TEXT NOT NULL CHECK (severidade IN ('info', 'aviso', 'critico')),
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT false,
  lido_por UUID REFERENCES public.perfis_usuario(id),
  lido_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expira_em TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_alertas_metas_meta_id ON public.alertas_metas(meta_id);
CREATE INDEX idx_alertas_metas_lido ON public.alertas_metas(lido);
CREATE INDEX idx_alertas_metas_criado_em ON public.alertas_metas(criado_em DESC);

-- View para cálculo de progresso em tempo real
CREATE OR REPLACE VIEW public.vw_metas_com_progresso AS
SELECT 
  m.*,
  CASE 
    WHEN m.valor_objetivo > 0 THEN (m.valor_atual / m.valor_objetivo * 100)
    ELSE 0 
  END as percentual_conclusao,
  CASE 
    WHEN m.valor_atual >= m.valor_objetivo THEN true
    ELSE false
  END as meta_atingida,
  EXTRACT(EPOCH FROM (m.periodo_fim - m.periodo_inicio)) / 86400 as total_dias,
  EXTRACT(EPOCH FROM (now() - m.periodo_inicio)) / 86400 as dias_decorridos,
  EXTRACT(EPOCH FROM (m.periodo_fim - now())) / 86400 as dias_restantes,
  CASE 
    WHEN now() < m.periodo_inicio THEN 'nao_iniciada'
    WHEN now() > m.periodo_fim THEN 'vencida'
    WHEN m.valor_atual >= m.valor_objetivo THEN 'concluida'
    WHEN EXTRACT(EPOCH FROM (m.periodo_fim - now())) / 86400 <= 3 THEN 'urgente'
    WHEN EXTRACT(EPOCH FROM (m.periodo_fim - now())) / 86400 <= 7 THEN 'atencao'
    ELSE 'no_prazo'
  END as situacao_prazo,
  e.nome as equipe_nome,
  e.lider_equipe_id,
  (SELECT COUNT(*) FROM public.alertas_metas WHERE meta_id = m.id AND lido = false) as alertas_nao_lidos
FROM public.metas_equipe m
LEFT JOIN public.equipes e ON e.id = m.equipe_id;

-- View para estatísticas de metas por equipe
CREATE OR REPLACE VIEW public.vw_estatisticas_metas_equipe AS
SELECT 
  e.id as equipe_id,
  e.nome as equipe_nome,
  COUNT(m.id) as total_metas,
  COUNT(CASE WHEN m.status = 'ativa' THEN 1 END) as metas_ativas,
  COUNT(CASE WHEN m.status = 'concluida' THEN 1 END) as metas_concluidas,
  COUNT(CASE WHEN m.valor_atual >= m.valor_objetivo THEN 1 END) as metas_atingidas,
  AVG(CASE 
    WHEN m.valor_objetivo > 0 THEN (m.valor_atual / m.valor_objetivo * 100)
    ELSE 0 
  END) as media_conclusao,
  COUNT(CASE WHEN now() > m.periodo_fim AND m.valor_atual < m.valor_objetivo THEN 1 END) as metas_vencidas
FROM public.equipes e
LEFT JOIN public.metas_equipe m ON m.equipe_id = e.id
GROUP BY e.id, e.nome;

-- Função para atualizar progresso de meta
CREATE OR REPLACE FUNCTION public.atualizar_progresso_meta(
  _meta_id UUID,
  _novo_valor NUMERIC,
  _origem TEXT DEFAULT 'manual',
  _referencia_id UUID DEFAULT NULL,
  _observacao TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  _valor_anterior NUMERIC;
  _valor_objetivo NUMERIC;
  _percentual NUMERIC;
  _meta_atingida BOOLEAN;
BEGIN
  -- Buscar valor atual
  SELECT valor_atual, valor_objetivo INTO _valor_anterior, _valor_objetivo
  FROM public.metas_equipe
  WHERE id = _meta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  -- Atualizar valor atual da meta
  UPDATE public.metas_equipe
  SET 
    valor_atual = _novo_valor,
    atualizado_em = now(),
    concluido_em = CASE 
      WHEN _novo_valor >= valor_objetivo AND concluido_em IS NULL THEN now()
      ELSE concluido_em
    END,
    status = CASE 
      WHEN _novo_valor >= valor_objetivo THEN 'concluida'
      ELSE status
    END
  WHERE id = _meta_id;

  -- Registrar no histórico (trigger calculará diferença e percentual)
  INSERT INTO public.progresso_metas (
    meta_id,
    valor_anterior,
    valor_novo,
    origem,
    referencia_id,
    observacao,
    registrado_por
  ) VALUES (
    _meta_id,
    _valor_anterior,
    _novo_valor,
    _origem,
    _referencia_id,
    _observacao,
    auth.uid()
  );

  -- Calcular percentual
  _percentual := CASE 
    WHEN _valor_objetivo > 0 THEN (_novo_valor / _valor_objetivo * 100)
    ELSE 0 
  END;

  _meta_atingida := _novo_valor >= _valor_objetivo;

  -- Criar alerta se meta foi atingida
  IF _meta_atingida AND _valor_anterior < _valor_objetivo THEN
    INSERT INTO public.alertas_metas (
      meta_id,
      tipo_alerta,
      severidade,
      mensagem
    ) VALUES (
      _meta_id,
      'meta_atingida',
      'info',
      'Meta atingida! Parabéns!'
    );
  END IF;

  -- Criar alerta se meta foi superada (>120%)
  IF _percentual >= 120 AND (_valor_anterior / _valor_objetivo * 100) < 120 THEN
    INSERT INTO public.alertas_metas (
      meta_id,
      tipo_alerta,
      severidade,
      mensagem
    ) VALUES (
      _meta_id,
      'meta_superada',
      'info',
      'Meta superada em ' || ROUND(_percentual - 100, 1) || '%!'
    );
  END IF;

  RETURN jsonb_build_object(
    'sucesso', true,
    'valor_anterior', _valor_anterior,
    'valor_novo', _novo_valor,
    'percentual_conclusao', _percentual,
    'meta_atingida', _meta_atingida
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar metas de vendas automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_meta_vendas_trigger()
RETURNS TRIGGER AS $$
DECLARE
  _meta RECORD;
BEGIN
  -- Buscar metas ativas de vendas da equipe do vendedor
  FOR _meta IN 
    SELECT m.id, m.valor_atual, m.metrica
    FROM public.metas_equipe m
    INNER JOIN public.membros_equipe me ON me.equipe_id = m.equipe_id
    WHERE me.usuario_id = NEW.vendedor_id
      AND m.tipo_meta = 'vendas'
      AND m.status = 'ativa'
      AND now() BETWEEN m.periodo_inicio AND m.periodo_fim
      AND me.esta_ativo = true
  LOOP
    -- Atualizar baseado na métrica
    IF _meta.metrica = 'valor_total' THEN
      PERFORM public.atualizar_progresso_meta(
        _meta.id,
        _meta.valor_atual + NEW.valor_total,
        'venda',
        NEW.id,
        'Venda adicionada - R$ ' || NEW.valor_total::TEXT
      );
    ELSIF _meta.metrica = 'quantidade' THEN
      PERFORM public.atualizar_progresso_meta(
        _meta.id,
        _meta.valor_atual + 1,
        'venda',
        NEW.id,
        'Venda adicionada'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_meta_vendas
  AFTER INSERT ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_meta_vendas_trigger();

-- Trigger para atualizar metas de tickets automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_meta_tickets_trigger()
RETURNS TRIGGER AS $$
DECLARE
  _meta RECORD;
  _tempo_resolucao NUMERIC;
BEGIN
  -- Só atualizar quando ticket for resolvido
  IF NEW.status = 'resolvido' AND (OLD.status IS NULL OR OLD.status != 'resolvido') THEN
    -- Buscar metas ativas de tickets da equipe do atendente
    FOR _meta IN 
      SELECT m.id, m.valor_atual, m.metrica, m.tipo_meta
      FROM public.metas_equipe m
      INNER JOIN public.membros_equipe me ON me.equipe_id = m.equipe_id
      WHERE me.usuario_id = NEW.atribuido_para
        AND m.tipo_meta IN ('tickets_resolvidos', 'tempo_resposta', 'atendimentos')
        AND m.status = 'ativa'
        AND now() BETWEEN m.periodo_inicio AND m.periodo_fim
        AND me.esta_ativo = true
    LOOP
      IF _meta.tipo_meta = 'tickets_resolvidos' AND _meta.metrica = 'quantidade' THEN
        PERFORM public.atualizar_progresso_meta(
          _meta.id,
          _meta.valor_atual + 1,
          'ticket',
          NEW.id,
          'Ticket #' || NEW.numero_ticket || ' resolvido'
        );
      ELSIF _meta.tipo_meta = 'tempo_resposta' AND _meta.metrica = 'tempo_medio' THEN
        -- Calcular tempo de resolução em horas
        _tempo_resolucao := EXTRACT(EPOCH FROM (NEW.resolvido_em - NEW.data_abertura)) / 3600;
        -- Atualizar com média móvel
        PERFORM public.atualizar_progresso_meta(
          _meta.id,
          (_meta.valor_atual + _tempo_resolucao) / 2,
          'ticket',
          NEW.id,
          'Tempo de resolução: ' || ROUND(_tempo_resolucao, 2) || 'h'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_meta_tickets
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_meta_tickets_trigger();

-- Função para verificar e criar alertas de prazo
CREATE OR REPLACE FUNCTION public.verificar_alertas_metas()
RETURNS void AS $$
DECLARE
  _meta RECORD;
  _dias_restantes NUMERIC;
  _percentual_tempo NUMERIC;
  _percentual_conclusao NUMERIC;
BEGIN
  FOR _meta IN 
    SELECT * FROM public.metas_equipe
    WHERE status = 'ativa'
      AND now() BETWEEN periodo_inicio AND periodo_fim
  LOOP
    _dias_restantes := EXTRACT(EPOCH FROM (_meta.periodo_fim - now())) / 86400;
    _percentual_tempo := (EXTRACT(EPOCH FROM (now() - _meta.periodo_inicio)) / 
                          EXTRACT(EPOCH FROM (_meta.periodo_fim - _meta.periodo_inicio))) * 100;
    _percentual_conclusao := CASE 
      WHEN _meta.valor_objetivo > 0 THEN (_meta.valor_atual / _meta.valor_objetivo * 100)
      ELSE 0 
    END;

    -- Alerta: Prazo próximo (3 dias ou menos)
    IF _dias_restantes <= 3 AND _percentual_conclusao < 100 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alertas_metas 
        WHERE meta_id = _meta.id 
          AND tipo_alerta = 'prazo_proximo'
          AND criado_em > now() - INTERVAL '24 hours'
      ) THEN
        INSERT INTO public.alertas_metas (
          meta_id,
          tipo_alerta,
          severidade,
          mensagem,
          expira_em
        ) VALUES (
          _meta.id,
          'prazo_proximo',
          'aviso',
          'Restam apenas ' || ROUND(_dias_restantes, 1) || ' dias. Meta em ' || ROUND(_percentual_conclusao, 1) || '%',
          _meta.periodo_fim
        );
      END IF;
    END IF;

    -- Alerta: Meta em risco (80% do tempo passou mas só tem <60% de conclusão)
    IF _percentual_tempo >= 80 AND _percentual_conclusao < 60 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alertas_metas 
        WHERE meta_id = _meta.id 
          AND tipo_alerta = 'meta_em_risco'
          AND criado_em > now() - INTERVAL '24 hours'
      ) THEN
        INSERT INTO public.alertas_metas (
          meta_id,
          tipo_alerta,
          severidade,
          mensagem,
          expira_em
        ) VALUES (
          _meta.id,
          'meta_em_risco',
          'critico',
          'Meta em risco! ' || ROUND(_percentual_tempo, 1) || '% do prazo passou, apenas ' || ROUND(_percentual_conclusao, 1) || '% concluído',
          _meta.periodo_fim
        );
      END IF;
    END IF;

    -- Alerta: Sem progresso (nenhum progresso nos últimos 7 dias)
    IF NOT EXISTS (
      SELECT 1 FROM public.progresso_metas 
      WHERE meta_id = _meta.id 
        AND registrado_em > now() - INTERVAL '7 days'
    ) AND _dias_restantes > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alertas_metas 
        WHERE meta_id = _meta.id 
          AND tipo_alerta = 'sem_progresso'
          AND criado_em > now() - INTERVAL '7 days'
      ) THEN
        INSERT INTO public.alertas_metas (
          meta_id,
          tipo_alerta,
          severidade,
          mensagem,
          expira_em
        ) VALUES (
          _meta.id,
          'sem_progresso',
          'aviso',
          'Sem progresso nos últimos 7 dias',
          _meta.periodo_fim
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.metas_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_metas ENABLE ROW LEVEL SECURITY;

-- Políticas para metas_equipe
CREATE POLICY "Membros podem ver metas de suas equipes"
  ON public.metas_equipe FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.membros_equipe me
      WHERE me.equipe_id = metas_equipe.equipe_id
        AND me.usuario_id = auth.uid()
        AND me.esta_ativo = true
    )
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Líderes e admins podem criar metas"
  ON public.metas_equipe FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipes e
      WHERE e.id = equipe_id
        AND (e.lider_equipe_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

CREATE POLICY "Líderes e admins podem atualizar metas"
  ON public.metas_equipe FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.equipes e
      WHERE e.id = equipe_id
        AND (e.lider_equipe_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

CREATE POLICY "Líderes e admins podem deletar metas"
  ON public.metas_equipe FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.equipes e
      WHERE e.id = equipe_id
        AND (e.lider_equipe_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

-- Políticas para progresso_metas
CREATE POLICY "Todos podem ver progresso de metas de suas equipes"
  ON public.progresso_metas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.metas_equipe m
      INNER JOIN public.membros_equipe me ON me.equipe_id = m.equipe_id
      WHERE m.id = progresso_metas.meta_id
        AND me.usuario_id = auth.uid()
        AND me.esta_ativo = true
    )
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Sistema pode inserir progresso automaticamente"
  ON public.progresso_metas FOR INSERT
  WITH CHECK (true);

-- Políticas para alertas_metas
CREATE POLICY "Membros podem ver alertas de suas equipes"
  ON public.alertas_metas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.metas_equipe m
      INNER JOIN public.membros_equipe me ON me.equipe_id = m.equipe_id
      WHERE m.id = alertas_metas.meta_id
        AND me.usuario_id = auth.uid()
        AND me.esta_ativo = true
    )
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Membros podem marcar alertas como lidos"
  ON public.alertas_metas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.metas_equipe m
      INNER JOIN public.membros_equipe me ON me.equipe_id = m.equipe_id
      WHERE m.id = alertas_metas.meta_id
        AND me.usuario_id = auth.uid()
        AND me.esta_ativo = true
    )
  );

-- Trigger para atualizar timestamp
CREATE TRIGGER update_metas_equipe_timestamp
  BEFORE UPDATE ON public.metas_equipe
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();