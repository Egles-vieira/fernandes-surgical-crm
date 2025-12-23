-- ============================================
-- CORREÇÕES AGENTE VENDAS WHATSAPP V4
-- Fase 1: Migração SQL - Gerenciamento de Carrinho
-- ============================================

-- 1. NOVOS CAMPOS NA TABELA DE SESSÕES
-- ============================================

-- Adicionar campo para sugestões de busca (separado do carrinho)
ALTER TABLE whatsapp_agente_sessoes 
ADD COLUMN IF NOT EXISTS sugestoes_busca JSONB DEFAULT '[]'::jsonb;

-- Adicionar campo para contexto resumido (memória de longo prazo)
ALTER TABLE whatsapp_agente_sessoes 
ADD COLUMN IF NOT EXISTS contexto_resumido TEXT;

-- Comentários para documentação
COMMENT ON COLUMN whatsapp_agente_sessoes.sugestoes_busca IS 'Sugestões retornadas por buscar_produtos - NÃO confundir com carrinho!';
COMMENT ON COLUMN whatsapp_agente_sessoes.contexto_resumido IS 'Resumo do contexto da conversa para memória de longo prazo';

-- 2. RPC ATÔMICA: ADICIONAR ITEM AO CARRINHO (com advisory lock)
-- ============================================

CREATE OR REPLACE FUNCTION adicionar_item_carrinho(
  p_conversa_id UUID,
  p_produto_id UUID,
  p_quantidade INTEGER,
  p_produto_nome TEXT,
  p_produto_referencia TEXT DEFAULT NULL,
  p_preco_unitario NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_carrinho JSONB;
  v_novo_item JSONB;
  v_total_itens INTEGER;
  v_idx INTEGER;
  v_encontrou BOOLEAN := FALSE;
  v_carrinho_atualizado JSONB;
BEGIN
  -- Lock para evitar race condition
  PERFORM pg_advisory_xact_lock(hashtext(p_conversa_id::text));
  
  -- Buscar carrinho atual com FOR UPDATE para lock de linha
  SELECT COALESCE(produtos_carrinho, '[]'::jsonb) INTO v_carrinho
  FROM whatsapp_conversas
  WHERE id = p_conversa_id
  FOR UPDATE;
  
  -- Montar novo item
  v_novo_item := jsonb_build_object(
    'id', p_produto_id,
    'produto_id', p_produto_id,
    'quantidade', p_quantidade,
    'nome', p_produto_nome,
    'referencia', p_produto_referencia,
    'preco_unitario', p_preco_unitario,
    'adicionado_em', NOW()
  );
  
  -- Verificar se produto já existe no carrinho
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_carrinho) elem
    WHERE (elem->>'id')::uuid = p_produto_id OR (elem->>'produto_id')::uuid = p_produto_id
  ) THEN
    -- Atualizar quantidade (somar)
    v_carrinho_atualizado := (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'id')::uuid = p_produto_id OR (elem->>'produto_id')::uuid = p_produto_id
          THEN elem || jsonb_build_object('quantidade', (elem->>'quantidade')::int + p_quantidade)
          ELSE elem
        END
      )
      FROM jsonb_array_elements(v_carrinho) elem
    );
    v_carrinho := v_carrinho_atualizado;
  ELSE
    -- Adicionar novo item (append)
    v_carrinho := v_carrinho || jsonb_build_array(v_novo_item);
  END IF;
  
  -- Atualizar conversa
  UPDATE whatsapp_conversas
  SET produtos_carrinho = v_carrinho,
      atualizado_em = NOW()
  WHERE id = p_conversa_id;
  
  -- Sincronizar com sessão ativa
  UPDATE whatsapp_agente_sessoes
  SET carrinho_itens = v_carrinho,
      atualizado_em = NOW()
  WHERE conversa_id = p_conversa_id
    AND expira_em > NOW();
  
  -- Contar total
  SELECT jsonb_array_length(v_carrinho) INTO v_total_itens;
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'carrinho_total_itens', v_total_itens,
    'item_adicionado', v_novo_item,
    'carrinho_atual', v_carrinho
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. RPC ATÔMICA: ALTERAR QUANTIDADE DE ITEM NO CARRINHO
-- ============================================

CREATE OR REPLACE FUNCTION alterar_quantidade_item_carrinho(
  p_conversa_id UUID,
  p_produto_id UUID DEFAULT NULL,
  p_numero_item INTEGER DEFAULT NULL,
  p_nova_quantidade INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_carrinho JSONB;
  v_carrinho_atualizado JSONB;
  v_item_alterado JSONB;
  v_total_itens INTEGER;
  v_idx INTEGER := 0;
BEGIN
  -- Lock para evitar race condition
  PERFORM pg_advisory_xact_lock(hashtext(p_conversa_id::text));
  
  -- Buscar carrinho atual
  SELECT COALESCE(produtos_carrinho, '[]'::jsonb) INTO v_carrinho
  FROM whatsapp_conversas
  WHERE id = p_conversa_id
  FOR UPDATE;
  
  -- Se quantidade é 0 ou menor, remover o item
  IF p_nova_quantidade IS NOT NULL AND p_nova_quantidade <= 0 THEN
    -- Chamar remoção
    RETURN remover_item_carrinho(p_conversa_id, p_produto_id, p_numero_item);
  END IF;
  
  -- Alterar por produto_id
  IF p_produto_id IS NOT NULL THEN
    v_carrinho_atualizado := (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'id')::uuid = p_produto_id OR (elem->>'produto_id')::uuid = p_produto_id
          THEN elem || jsonb_build_object('quantidade', p_nova_quantidade)
          ELSE elem
        END
      )
      FROM jsonb_array_elements(v_carrinho) elem
    );
    
    -- Pegar item alterado para retorno
    SELECT elem INTO v_item_alterado
    FROM jsonb_array_elements(v_carrinho) elem
    WHERE (elem->>'id')::uuid = p_produto_id OR (elem->>'produto_id')::uuid = p_produto_id
    LIMIT 1;
    
  -- Alterar por número do item (1-indexed)
  ELSIF p_numero_item IS NOT NULL THEN
    v_carrinho_atualizado := (
      SELECT jsonb_agg(
        CASE
          WHEN rn = p_numero_item
          THEN elem || jsonb_build_object('quantidade', p_nova_quantidade)
          ELSE elem
        END
      )
      FROM (
        SELECT elem, row_number() OVER () as rn
        FROM jsonb_array_elements(v_carrinho) elem
      ) sub
    );
    
    -- Pegar item alterado
    SELECT elem INTO v_item_alterado
    FROM (
      SELECT elem, row_number() OVER () as rn
      FROM jsonb_array_elements(v_carrinho) elem
    ) sub
    WHERE rn = p_numero_item;
  ELSE
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'parametro_obrigatorio',
      'mensagem', 'Informe produto_id ou numero_item'
    );
  END IF;
  
  IF v_item_alterado IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'item_nao_encontrado',
      'mensagem', 'Item não encontrado no carrinho'
    );
  END IF;
  
  -- Atualizar conversa
  UPDATE whatsapp_conversas
  SET produtos_carrinho = v_carrinho_atualizado,
      atualizado_em = NOW()
  WHERE id = p_conversa_id;
  
  -- Sincronizar com sessão
  UPDATE whatsapp_agente_sessoes
  SET carrinho_itens = v_carrinho_atualizado,
      atualizado_em = NOW()
  WHERE conversa_id = p_conversa_id
    AND expira_em > NOW();
  
  SELECT jsonb_array_length(v_carrinho_atualizado) INTO v_total_itens;
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'carrinho_total_itens', v_total_itens,
    'item_alterado', v_item_alterado || jsonb_build_object('quantidade', p_nova_quantidade),
    'carrinho_atual', v_carrinho_atualizado
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. RPC ATÔMICA: REMOVER ITEM DO CARRINHO
-- ============================================

CREATE OR REPLACE FUNCTION remover_item_carrinho(
  p_conversa_id UUID,
  p_produto_id UUID DEFAULT NULL,
  p_numero_item INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_carrinho JSONB;
  v_carrinho_atualizado JSONB;
  v_item_removido JSONB;
  v_total_itens INTEGER;
BEGIN
  -- Lock para evitar race condition
  PERFORM pg_advisory_xact_lock(hashtext(p_conversa_id::text));
  
  -- Buscar carrinho atual
  SELECT COALESCE(produtos_carrinho, '[]'::jsonb) INTO v_carrinho
  FROM whatsapp_conversas
  WHERE id = p_conversa_id
  FOR UPDATE;
  
  -- Remover por produto_id
  IF p_produto_id IS NOT NULL THEN
    -- Guardar item que será removido
    SELECT elem INTO v_item_removido
    FROM jsonb_array_elements(v_carrinho) elem
    WHERE (elem->>'id')::uuid = p_produto_id OR (elem->>'produto_id')::uuid = p_produto_id
    LIMIT 1;
    
    -- Filtrar para remover
    v_carrinho_atualizado := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_carrinho) elem
      WHERE NOT ((elem->>'id')::uuid = p_produto_id OR (elem->>'produto_id')::uuid = p_produto_id)
    );
    
  -- Remover por número do item (1-indexed)
  ELSIF p_numero_item IS NOT NULL THEN
    -- Guardar item que será removido
    SELECT elem INTO v_item_removido
    FROM (
      SELECT elem, row_number() OVER () as rn
      FROM jsonb_array_elements(v_carrinho) elem
    ) sub
    WHERE rn = p_numero_item;
    
    -- Filtrar para remover
    v_carrinho_atualizado := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM (
        SELECT elem, row_number() OVER () as rn
        FROM jsonb_array_elements(v_carrinho) elem
      ) sub
      WHERE rn != p_numero_item
    );
  ELSE
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'parametro_obrigatorio',
      'mensagem', 'Informe produto_id ou numero_item'
    );
  END IF;
  
  IF v_item_removido IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'item_nao_encontrado',
      'mensagem', 'Item não encontrado no carrinho'
    );
  END IF;
  
  -- Atualizar conversa
  UPDATE whatsapp_conversas
  SET produtos_carrinho = v_carrinho_atualizado,
      atualizado_em = NOW()
  WHERE id = p_conversa_id;
  
  -- Sincronizar com sessão
  UPDATE whatsapp_agente_sessoes
  SET carrinho_itens = v_carrinho_atualizado,
      atualizado_em = NOW()
  WHERE conversa_id = p_conversa_id
    AND expira_em > NOW();
  
  SELECT jsonb_array_length(v_carrinho_atualizado) INTO v_total_itens;
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'carrinho_total_itens', v_total_itens,
    'item_removido', v_item_removido,
    'carrinho_atual', v_carrinho_atualizado
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. RPC: OBTER CARRINHO COMPLETO
-- ============================================

CREATE OR REPLACE FUNCTION obter_carrinho_completo(
  p_conversa_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_carrinho JSONB;
  v_total_itens INTEGER;
  v_valor_estimado NUMERIC := 0;
BEGIN
  -- Buscar carrinho da conversa
  SELECT COALESCE(produtos_carrinho, '[]'::jsonb) INTO v_carrinho
  FROM whatsapp_conversas
  WHERE id = p_conversa_id;
  
  SELECT jsonb_array_length(v_carrinho) INTO v_total_itens;
  
  -- Calcular valor estimado
  SELECT COALESCE(SUM(
    (elem->>'quantidade')::numeric * 
    COALESCE((elem->>'preco_unitario')::numeric, 0)
  ), 0) INTO v_valor_estimado
  FROM jsonb_array_elements(v_carrinho) elem;
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'carrinho', v_carrinho,
    'total_itens', v_total_itens,
    'valor_estimado', v_valor_estimado
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- 6. RPC: INCREMENTAR TOOLS EXECUTADAS (fallback para código existente)
-- ============================================

CREATE OR REPLACE FUNCTION increment_sessao_tools(
  sessao_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_agente_sessoes
  SET total_tools_executadas = COALESCE(total_tools_executadas, 0) + 1,
      atualizado_em = NOW()
  WHERE id = sessao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 7. ÍNDICES PARA PERFORMANCE (sem usar NOW() em predicados)
-- ============================================

-- Índice para buscar sessões por conversa (sem predicado parcial com NOW)
CREATE INDEX IF NOT EXISTS idx_whatsapp_agente_sessoes_conversa_expira 
ON whatsapp_agente_sessoes (conversa_id, expira_em DESC);

-- Índice para produtos_carrinho (GIN para JSONB)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_produtos_carrinho 
ON whatsapp_conversas USING GIN (produtos_carrinho);

-- Índice para sugestoes_busca (GIN para JSONB)
CREATE INDEX IF NOT EXISTS idx_whatsapp_agente_sessoes_sugestoes 
ON whatsapp_agente_sessoes USING GIN (sugestoes_busca);


-- 8. TRIGGER: SINCRONIZAR CARRINHO CONVERSA <-> SESSÃO
-- ============================================

CREATE OR REPLACE FUNCTION trg_sync_carrinho_sessao()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando conversa é atualizada, sincronizar com sessão ativa
  IF TG_OP = 'UPDATE' AND NEW.produtos_carrinho IS DISTINCT FROM OLD.produtos_carrinho THEN
    UPDATE whatsapp_agente_sessoes
    SET carrinho_itens = NEW.produtos_carrinho,
        atualizado_em = NOW()
    WHERE conversa_id = NEW.id
      AND expira_em > NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trg_sync_carrinho ON whatsapp_conversas;
CREATE TRIGGER trg_sync_carrinho
  AFTER UPDATE ON whatsapp_conversas
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_carrinho_sessao();


-- 9. GRANTS PARA FUNÇÕES
-- ============================================

GRANT EXECUTE ON FUNCTION adicionar_item_carrinho(UUID, UUID, INTEGER, TEXT, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION alterar_quantidade_item_carrinho(UUID, UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION remover_item_carrinho(UUID, UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION obter_carrinho_completo(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_sessao_tools(UUID) TO authenticated, service_role;