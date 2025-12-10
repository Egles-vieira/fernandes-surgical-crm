
-- =====================================================
-- AJUSTA TRIGGER PARA PERMITIR VENDEDORES ALTERAREM RESPONSAVEL_ID
-- =====================================================

CREATE OR REPLACE FUNCTION protect_vendas_critical_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_role_level INTEGER;
BEGIN
  -- Obter nível hierárquico do usuário
  SELECT COALESCE(MIN(rh.nivel), 999)
  INTO user_role_level
  FROM user_roles ur
  JOIN role_hierarquia rh ON rh.role = ur.role
  WHERE ur.user_id = auth.uid();

  -- Se usuário é admin ou gerente (nível <= 3), permite tudo
  IF user_role_level <= 3 THEN
    RETURN NEW;
  END IF;

  -- Para vendedores (nível > 3), bloquear apenas campos realmente críticos
  -- REMOVIDO responsavel_id da lista - vendedores podem alterar o contato responsável
  
  -- Bloquear alteração de vendedor_id (quem é o vendedor da proposta)
  IF OLD.vendedor_id IS DISTINCT FROM NEW.vendedor_id THEN
    RAISE EXCEPTION 'Você não tem permissão para alterar o vendedor da venda';
  END IF;

  -- Bloquear alteração de user_id (criador)
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Você não tem permissão para alterar o criador da venda';
  END IF;

  -- Bloquear alteração de cliente_id
  IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    RAISE EXCEPTION 'Você não tem permissão para alterar o cliente da venda';
  END IF;

  -- Bloquear alteração de aprovado_em (apenas gerentes podem aprovar)
  IF OLD.aprovado_em IS DISTINCT FROM NEW.aprovado_em THEN
    RAISE EXCEPTION 'Você não tem permissão para aprovar vendas';
  END IF;

  -- Bloquear alteração de aprovado_por
  IF OLD.aprovado_por IS DISTINCT FROM NEW.aprovado_por THEN
    RAISE EXCEPTION 'Você não tem permissão para definir aprovador';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
