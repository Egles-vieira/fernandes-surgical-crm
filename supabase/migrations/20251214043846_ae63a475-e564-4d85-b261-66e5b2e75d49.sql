-- Tabela de histórico de status de templates
CREATE TABLE IF NOT EXISTS whatsapp_templates_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES whatsapp_templates(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  motivo_rejeicao TEXT,
  quality_score JSONB,
  sincronizado_em TIMESTAMPTZ DEFAULT now(),
  dados_meta JSONB,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_templates_historico_template ON whatsapp_templates_historico(template_id);
CREATE INDEX idx_templates_historico_data ON whatsapp_templates_historico(sincronizado_em DESC);

-- Adicionar campos na whatsapp_templates
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS meta_template_id TEXT;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS quality_score JSONB;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS quality_score_date TIMESTAMPTZ;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS components_meta JSONB;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS ultima_sincronizacao_em TIMESTAMPTZ;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS sincronizado_com_meta BOOLEAN DEFAULT false;

-- Atualizar constraint de status para incluir valores da Meta
ALTER TABLE whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_status_aprovacao_check;
ALTER TABLE whatsapp_templates ADD CONSTRAINT whatsapp_templates_status_aprovacao_check 
  CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'));

-- RLS para histórico
ALTER TABLE whatsapp_templates_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_historico_select" ON whatsapp_templates_historico 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_historico_insert" ON whatsapp_templates_historico 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir service role full access
CREATE POLICY "templates_historico_service" ON whatsapp_templates_historico 
  FOR ALL TO service_role USING (true) WITH CHECK (true);