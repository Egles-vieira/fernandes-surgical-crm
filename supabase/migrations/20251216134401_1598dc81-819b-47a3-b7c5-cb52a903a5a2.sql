-- Nova tabela específica para filas de WhatsApp
CREATE TABLE public.whatsapp_filas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#3B82F6',
  icone VARCHAR(50) DEFAULT 'inbox',
  ordem INTEGER DEFAULT 0,
  
  -- Configurações específicas de WhatsApp
  sla_primeira_resposta_minutos INTEGER DEFAULT 5,
  sla_resolucao_minutos INTEGER DEFAULT 60,
  max_conversas_simultaneas INTEGER,
  
  -- Horário de funcionamento (pode ser NULL = sempre ativa)
  horario_inicio TIME,
  horario_fim TIME,
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}',
  
  -- Unidade (opcional - fila pode ser global ou de unidade)
  unidade_id UUID REFERENCES public.whatsapp_unidades(id) ON DELETE SET NULL,
  
  -- Controle
  esta_ativa BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_whatsapp_filas_ativa ON whatsapp_filas(esta_ativa);
CREATE INDEX idx_whatsapp_filas_unidade ON whatsapp_filas(unidade_id);
CREATE INDEX idx_whatsapp_filas_ordem ON whatsapp_filas(ordem);

-- RLS
ALTER TABLE whatsapp_filas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_filas_select" ON whatsapp_filas 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "whatsapp_filas_insert" ON whatsapp_filas 
  FOR INSERT TO authenticated 
  WITH CHECK (auth_is_admin() OR auth_is_manager());

CREATE POLICY "whatsapp_filas_update" ON whatsapp_filas 
  FOR UPDATE TO authenticated 
  USING (auth_is_admin() OR auth_is_manager());

CREATE POLICY "whatsapp_filas_delete" ON whatsapp_filas 
  FOR DELETE TO authenticated 
  USING (auth_is_admin() OR auth_is_manager());

-- Adicionar coluna whatsapp_fila_id em whatsapp_conversas
ALTER TABLE whatsapp_conversas 
  ADD COLUMN IF NOT EXISTS whatsapp_fila_id UUID REFERENCES public.whatsapp_filas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_whatsapp_fila ON whatsapp_conversas(whatsapp_fila_id);

-- Adicionar coluna whatsapp_fila_id em whatsapp_fila_espera
ALTER TABLE whatsapp_fila_espera
  ADD COLUMN IF NOT EXISTS whatsapp_fila_id UUID REFERENCES public.whatsapp_filas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_fila_espera_whatsapp_fila ON whatsapp_fila_espera(whatsapp_fila_id);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_whatsapp_filas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_whatsapp_filas_updated_at
  BEFORE UPDATE ON whatsapp_filas
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_filas_updated_at();

-- Inserir fila padrão
INSERT INTO whatsapp_filas (nome, descricao, cor, icone, ordem)
VALUES ('Geral', 'Fila padrão para atendimentos WhatsApp', '#3B82F6', 'inbox', 0);