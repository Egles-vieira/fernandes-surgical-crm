-- =====================================================
-- CORREÇÃO: Segurança da Gestão de Fila WhatsApp
-- Data: 2025-01-23
-- Descrição: Adiciona RLS e corrige search_path
-- =====================================================

-- 1. Habilitar RLS na tabela de log de atribuições
ALTER TABLE whatsapp_log_atribuicoes ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas RLS para whatsapp_log_atribuicoes
CREATE POLICY "Admins e managers podem ver todos os logs"
  ON whatsapp_log_atribuicoes
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Vendedores podem ver seus logs"
  ON whatsapp_log_atribuicoes
  FOR SELECT
  USING (
    vendedor_novo_id = auth.uid() 
    OR vendedor_anterior_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Sistema pode inserir logs"
  ON whatsapp_log_atribuicoes
  FOR INSERT
  WITH CHECK (true);

-- 3. Corrigir search_path da função atualizar_timestamp_disponibilidade
CREATE OR REPLACE FUNCTION atualizar_timestamp_disponibilidade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.esta_disponivel IS DISTINCT FROM OLD.esta_disponivel THEN
    NEW.atualizado_em = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;