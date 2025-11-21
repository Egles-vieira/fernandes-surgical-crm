-- Ajustar função de proteção de campos críticos para permitir definir cliente em vendas novas/rascunho
CREATE OR REPLACE FUNCTION protect_vendas_critical_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário tem acesso total, permite tudo
  IF has_any_role(auth.uid(), ARRAY[
    'admin'::app_role,
    'diretor_comercial'::app_role,
    'gerente_comercial'::app_role,
    'coordenador_comercial'::app_role,
    'manager'::app_role
  ]) THEN
    RETURN NEW;
  END IF;

  -- Para perfis restritos, bloqueia alterações em campos críticos
  IF has_any_role(auth.uid(), ARRAY[
    'sales'::app_role,
    'representante_comercial'::app_role,
    'executivo_contas'::app_role
  ]) THEN
    -- Permite definir cliente_id se ainda não estiver definido (venda nova/rascunho)
    -- ou se a venda está em rascunho
    IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      IF OLD.cliente_id IS NOT NULL AND OLD.status != 'rascunho' THEN
        RAISE EXCEPTION 'Você não tem permissão para alterar o cliente da venda';
      END IF;
    END IF;
    
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar o criador da venda';
    END IF;
    
    IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar o responsável da venda';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;