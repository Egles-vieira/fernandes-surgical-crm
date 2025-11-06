-- Corrigir função de notificações de vendas
CREATE OR REPLACE FUNCTION notificar_mudancas_venda()
RETURNS TRIGGER AS $$
DECLARE
  v_titulo TEXT;
  v_descricao TEXT;
  v_tipo TEXT;
  v_metadata JSONB;
  v_nome_responsavel TEXT;
BEGIN
  -- Buscar nome do responsável (perfis_usuario não tem email, só nome)
  SELECT COALESCE(nome_completo, primeiro_nome || ' ' || sobrenome, primeiro_nome, 'Vendedor')
  INTO v_nome_responsavel
  FROM perfis_usuario
  WHERE id = COALESCE(NEW.vendedor_id, NEW.responsavel_id);

  -- Preparar metadata base
  v_metadata := jsonb_build_object(
    'venda_id', NEW.id,
    'numero_venda', NEW.numero_venda,
    'cliente_nome', NEW.cliente_nome,
    'valor_final', NEW.valor_final,
    'status', NEW.status
  );

  -- INSERT: Nova venda criada
  IF TG_OP = 'INSERT' THEN
    v_titulo := 'Nova venda criada';
    v_descricao := 'Venda #' || NEW.numero_venda || ' para ' || NEW.cliente_nome || ' foi criada';
    v_tipo := 'venda_criada';
    
    -- Notificar o responsável
    IF NEW.vendedor_id IS NOT NULL THEN
      INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
      VALUES (NEW.vendedor_id, v_titulo, v_descricao, v_tipo, NEW.id, 'venda', v_metadata);
    END IF;

    -- Notificar admins/managers se valor alto
    IF NEW.valor_final >= 10000 THEN
      INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
      SELECT 
        ur.user_id,
        'Venda de alto valor criada',
        'Venda #' || NEW.numero_venda || ' no valor de R$ ' || NEW.valor_final::TEXT || ' foi criada por ' || COALESCE(v_nome_responsavel, 'usuário'),
        'venda_alto_valor',
        NEW.id,
        'venda',
        v_metadata
      FROM user_roles ur
      WHERE ur.role IN ('admin', 'manager')
      AND ur.user_id != NEW.vendedor_id;
    END IF;

  -- UPDATE: Detectar mudanças
  ELSIF TG_OP = 'UPDATE' THEN
    
    -- Mudança de etapa no pipeline
    IF OLD.etapa_pipeline IS DISTINCT FROM NEW.etapa_pipeline THEN
      v_metadata := v_metadata || jsonb_build_object(
        'etapa_anterior', OLD.etapa_pipeline,
        'etapa_nova', NEW.etapa_pipeline
      );
      
      v_titulo := 'Venda movida no pipeline';
      v_descricao := 'Venda #' || NEW.numero_venda || ' movida para ' || 
        CASE NEW.etapa_pipeline
          WHEN 'prospeccao' THEN 'Prospecção'
          WHEN 'qualificacao' THEN 'Qualificação'
          WHEN 'proposta' THEN 'Proposta'
          WHEN 'negociacao' THEN 'Negociação'
          WHEN 'fechamento' THEN 'Fechamento'
          WHEN 'ganho' THEN 'Ganho'
          WHEN 'perdido' THEN 'Perdido'
        END;
      v_tipo := 'venda_mudanca_etapa';
      
      IF NEW.vendedor_id IS NOT NULL THEN
        INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
        VALUES (NEW.vendedor_id, v_titulo, v_descricao, v_tipo, NEW.id, 'venda', v_metadata);
      END IF;

      -- Notificar gestores quando ganhar ou perder
      IF NEW.etapa_pipeline IN ('ganho', 'perdido') THEN
        INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
        SELECT 
          ur.user_id,
          CASE 
            WHEN NEW.etapa_pipeline = 'ganho' THEN 'Venda fechada com sucesso'
            ELSE 'Venda perdida'
          END,
          'Venda #' || NEW.numero_venda || ' de ' || COALESCE(v_nome_responsavel, 'vendedor') || ' - ' || NEW.cliente_nome,
          CASE 
            WHEN NEW.etapa_pipeline = 'ganho' THEN 'venda_ganha'
            ELSE 'venda_perdida'
          END,
          NEW.id,
          'venda',
          v_metadata
        FROM user_roles ur
        WHERE ur.role IN ('admin', 'manager')
        AND ur.user_id != NEW.vendedor_id;
      END IF;
    END IF;

    -- Mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_metadata := v_metadata || jsonb_build_object(
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      );

      -- Venda aprovada
      IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
        v_titulo := 'Venda aprovada';
        v_descricao := 'Venda #' || NEW.numero_venda || ' foi aprovada';
        v_tipo := 'venda_aprovada';
        
        IF NEW.vendedor_id IS NOT NULL THEN
          INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
          VALUES (NEW.vendedor_id, v_titulo, v_descricao, v_tipo, NEW.id, 'venda', v_metadata);
        END IF;
      END IF;

      -- Venda cancelada
      IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
        v_titulo := 'Venda cancelada';
        v_descricao := 'Venda #' || NEW.numero_venda || ' foi cancelada';
        v_tipo := 'venda_cancelada';
        
        IF NEW.vendedor_id IS NOT NULL THEN
          INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
          VALUES (NEW.vendedor_id, v_titulo, v_descricao, v_tipo, NEW.id, 'venda', v_metadata);
        END IF;
      END IF;

      -- Enviado para diretoria (aguardando aprovação)
      IF NEW.status = 'enviado_diretoria' AND OLD.status != 'enviado_diretoria' THEN
        -- Notificar admins/managers
        INSERT INTO notificacoes (usuario_id, titulo, descricao, tipo, entidade_id, entidade_tipo, metadata)
        SELECT 
          ur.user_id,
          'Venda aguardando aprovação',
          'Venda #' || NEW.numero_venda || ' de ' || COALESCE(v_nome_responsavel, 'vendedor') || ' aguarda aprovação - R$ ' || NEW.valor_final::TEXT,
          'venda_aguardando_aprovacao',
          NEW.id,
          'venda',
          v_metadata
        FROM user_roles ur
        WHERE ur.role IN ('admin', 'manager')
        AND ur.user_id != NEW.vendedor_id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;