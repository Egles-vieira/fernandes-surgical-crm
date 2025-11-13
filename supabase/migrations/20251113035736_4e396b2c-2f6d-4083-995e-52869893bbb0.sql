-- Adicionar campo status_atendimento na tabela perfis_usuario
ALTER TABLE perfis_usuario 
ADD COLUMN IF NOT EXISTS status_atendimento character varying NOT NULL DEFAULT 'offline';

-- Adicionar constraint para validar valores permitidos
ALTER TABLE perfis_usuario 
ADD CONSTRAINT status_atendimento_check 
CHECK (status_atendimento IN ('online', 'ocupado', 'ausente', 'offline'));

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_status_atendimento 
ON perfis_usuario(status_atendimento);

-- Criar tabela de log de mudanças de status (opcional, para histórico)
CREATE TABLE IF NOT EXISTS historico_status_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES perfis_usuario(id) ON DELETE CASCADE,
  status_anterior character varying,
  status_novo character varying NOT NULL,
  alterado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT status_check CHECK (
    status_anterior IN ('online', 'ocupado', 'ausente', 'offline') AND
    status_novo IN ('online', 'ocupado', 'ausente', 'offline')
  )
);

-- Criar índice para histórico
CREATE INDEX IF NOT EXISTS idx_historico_status_usuario 
ON historico_status_atendimento(usuario_id, alterado_em DESC);

-- Habilitar RLS
ALTER TABLE historico_status_atendimento ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seu próprio histórico e admins podem ver tudo
CREATE POLICY "Usuários podem ver histórico de status"
ON historico_status_atendimento
FOR SELECT
USING (
  usuario_id = auth.uid() OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Policy: Sistema pode inserir histórico
CREATE POLICY "Sistema pode inserir histórico de status"
ON historico_status_atendimento
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Função para registrar mudanças de status automaticamente
CREATE OR REPLACE FUNCTION registrar_mudanca_status_atendimento()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_atendimento IS DISTINCT FROM NEW.status_atendimento THEN
    INSERT INTO historico_status_atendimento (usuario_id, status_anterior, status_novo)
    VALUES (NEW.id, OLD.status_atendimento, NEW.status_atendimento);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para registrar mudanças
DROP TRIGGER IF EXISTS trigger_registrar_mudanca_status ON perfis_usuario;
CREATE TRIGGER trigger_registrar_mudanca_status
  AFTER UPDATE ON perfis_usuario
  FOR EACH ROW
  EXECUTE FUNCTION registrar_mudanca_status_atendimento();