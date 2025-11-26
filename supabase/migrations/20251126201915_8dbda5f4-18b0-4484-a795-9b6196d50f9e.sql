-- =====================================================
-- MIGRATION: Adicionar Gestão de Fila WhatsApp
-- Data: 2025-01-23
-- Descrição: Adiciona campos de disponibilidade para vendedores
--            e melhora o sistema de distribuição de conversas
-- =====================================================

-- 1. Adicionar campos de disponibilidade em perfis_usuario
ALTER TABLE perfis_usuario 
ADD COLUMN IF NOT EXISTS esta_disponivel BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS horario_trabalho_inicio TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS horario_trabalho_fim TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS max_conversas_simultaneas INTEGER DEFAULT 5;

-- 2. Comentários para documentação
COMMENT ON COLUMN perfis_usuario.esta_disponivel IS 'Indica se o vendedor está disponível para receber novas conversas';
COMMENT ON COLUMN perfis_usuario.horario_trabalho_inicio IS 'Horário de início do expediente';
COMMENT ON COLUMN perfis_usuario.horario_trabalho_fim IS 'Horário de fim do expediente';
COMMENT ON COLUMN perfis_usuario.max_conversas_simultaneas IS 'Número máximo de conversas simultâneas que o vendedor pode atender';

-- 3. Criar índice para buscar vendedores disponíveis rapidamente
CREATE INDEX IF NOT EXISTS idx_perfis_disponibilidade 
ON perfis_usuario(esta_disponivel) 
WHERE esta_disponivel = true;

-- 4. Atualizar perfis existentes para disponível
UPDATE perfis_usuario 
SET esta_disponivel = true 
WHERE esta_disponivel IS NULL;

-- 5. Criar view para facilitar consulta de vendedores disponíveis
CREATE OR REPLACE VIEW vw_vendedores_disponiveis AS
SELECT 
  p.id as user_id,
  p.nome_completo,
  p.esta_disponivel,
  p.max_conversas_simultaneas,
  p.horario_trabalho_inicio,
  p.horario_trabalho_fim,
  COUNT(CASE WHEN wc.status IN ('aberta', 'aguardando') THEN 1 END) as conversas_ativas,
  (p.max_conversas_simultaneas - COUNT(CASE WHEN wc.status IN ('aberta', 'aguardando') THEN 1 END)) as conversas_disponiveis,
  CASE 
    WHEN COUNT(CASE WHEN wc.status IN ('aberta', 'aguardando') THEN 1 END) >= p.max_conversas_simultaneas 
    THEN false 
    ELSE true 
  END as pode_receber_conversa
FROM perfis_usuario p
INNER JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN whatsapp_conversas wc ON wc.atribuida_para_id = p.id 
  AND wc.status IN ('aberta', 'aguardando')
WHERE ur.role = 'sales'
  AND p.esta_disponivel = true
GROUP BY p.id, p.nome_completo, p.esta_disponivel, p.max_conversas_simultaneas, 
         p.horario_trabalho_inicio, p.horario_trabalho_fim;

COMMENT ON VIEW vw_vendedores_disponiveis IS 'View que mostra vendedores disponíveis e sua capacidade de atendimento';

-- 6. Criar função para atribuir conversas em fila
CREATE OR REPLACE FUNCTION atribuir_conversas_em_fila()
RETURNS INTEGER AS $$
DECLARE
  conversas_atribuidas INTEGER := 0;
  conversa_record RECORD;
  vendedor_id UUID;
BEGIN
  FOR conversa_record IN 
    SELECT id, whatsapp_conta_id
    FROM whatsapp_conversas
    WHERE status = 'aguardando'
      AND atribuida_para_id IS NULL
    ORDER BY criado_em ASC
    LIMIT 50
  LOOP
    SELECT user_id INTO vendedor_id
    FROM vw_vendedores_disponiveis
    WHERE pode_receber_conversa = true
    ORDER BY conversas_ativas ASC
    LIMIT 1;

    IF vendedor_id IS NOT NULL THEN
      UPDATE whatsapp_conversas
      SET 
        atribuida_para_id = vendedor_id,
        status = 'aberta',
        atribuida_em = NOW(),
        atribuicao_automatica = true
      WHERE id = conversa_record.id;
      
      conversas_atribuidas := conversas_atribuidas + 1;
    END IF;
  END LOOP;

  RETURN conversas_atribuidas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION atribuir_conversas_em_fila() IS 'Atribui conversas em fila para vendedores disponíveis';

-- 7. Adicionar índices para melhorar performance das queries de fila
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_fila 
ON whatsapp_conversas(status, atribuida_para_id, criado_em) 
WHERE status = 'aguardando' AND atribuida_para_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_ativas 
ON whatsapp_conversas(atribuida_para_id, status) 
WHERE status IN ('aberta', 'aguardando');

-- 8. Trigger para atualizar timestamp quando vendedor muda disponibilidade
CREATE OR REPLACE FUNCTION atualizar_timestamp_disponibilidade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.esta_disponivel IS DISTINCT FROM OLD.esta_disponivel THEN
    NEW.atualizado_em = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_disponibilidade_vendedor ON perfis_usuario;
CREATE TRIGGER trigger_disponibilidade_vendedor
  BEFORE UPDATE ON perfis_usuario
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp_disponibilidade();

-- 9. Criar tabela de log de atribuições
CREATE TABLE IF NOT EXISTS whatsapp_log_atribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id),
  vendedor_anterior_id UUID,
  vendedor_novo_id UUID,
  motivo VARCHAR(50) NOT NULL,
  foi_automatico BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID
);

CREATE INDEX IF NOT EXISTS idx_log_atribuicoes_conversa ON whatsapp_log_atribuicoes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_log_atribuicoes_vendedor ON whatsapp_log_atribuicoes(vendedor_novo_id);

COMMENT ON TABLE whatsapp_log_atribuicoes IS 'Log de todas as atribuições e reatribuições de conversas';

-- 10. RLS policies para a view
ALTER VIEW vw_vendedores_disponiveis SET (security_invoker = true);

-- 11. Grant permissions
GRANT SELECT ON vw_vendedores_disponiveis TO authenticated;
GRANT EXECUTE ON FUNCTION atribuir_conversas_em_fila() TO authenticated;
GRANT SELECT, INSERT ON whatsapp_log_atribuicoes TO authenticated;