-- =====================================================
-- FASE 1: Índices Críticos para RLS (Maior Impacto)
-- =====================================================

-- user_roles - 22M seq_scans (CRÍTICO para RLS)
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role);
CREATE INDEX IF NOT EXISTS idx_user_roles_equipe ON user_roles (equipe_id) WHERE equipe_id IS NOT NULL;

-- role_hierarquia - 28K seq_scans
CREATE INDEX IF NOT EXISTS idx_role_hierarquia_nivel_role ON role_hierarquia (nivel, role);

-- equipes - usado em RLS
CREATE INDEX IF NOT EXISTS idx_equipes_lider ON equipes (lider_equipe_id);
CREATE INDEX IF NOT EXISTS idx_equipes_gestor ON equipes (gestor_id);
CREATE INDEX IF NOT EXISTS idx_equipes_ativa ON equipes (id) WHERE esta_ativa = true AND excluido_em IS NULL;

-- membros_equipe - usado em RLS
CREATE INDEX IF NOT EXISTS idx_membros_equipe_equipe_ativo ON membros_equipe (equipe_id, esta_ativo) WHERE esta_ativo = true;

-- =====================================================
-- FASE 2: Índices para Vendas e Pipeline
-- =====================================================

-- vendas
CREATE INDEX IF NOT EXISTS idx_vendas_status_data ON vendas (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_tipo_frete ON vendas (tipo_frete_id);
CREATE INDEX IF NOT EXISTS idx_vendas_condicao_pagamento ON vendas (condicao_pagamento_id);

-- vendas_itens
CREATE INDEX IF NOT EXISTS idx_vendas_itens_produto_valor ON vendas_itens (produto_id, valor_total);

-- pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_ativo ON pipelines (esta_ativo, ordem_exibicao) WHERE excluido_em IS NULL;

-- =====================================================
-- FASE 3: Índices WhatsApp
-- =====================================================

-- whatsapp_webhooks_log
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_recebido_em ON whatsapp_webhooks_log (recebido_em DESC);

-- whatsapp_conversas
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_atribuida_data ON whatsapp_conversas (atribuida_para_id, criado_em DESC) WHERE status != 'fechada';
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_conta_status ON whatsapp_conversas (whatsapp_conta_id, status);

-- whatsapp_contas
CREATE INDEX IF NOT EXISTS idx_whatsapp_contas_ativa ON whatsapp_contas (id) WHERE excluido_em IS NULL AND status = 'connected';

-- =====================================================
-- FASE 4: Índices Tickets e Usuários
-- =====================================================

-- tickets
CREATE INDEX IF NOT EXISTS idx_tickets_aberto_por_status ON tickets (aberto_por, status);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_email ON tickets (cliente_email);

-- perfis_usuario
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_empresa ON perfis_usuario (empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_ativo ON perfis_usuario (id) WHERE esta_ativo = true;

-- =====================================================
-- FASE 5: Índices para Dashboard Performance
-- =====================================================

-- integracoes_totvs_calcula_frete
CREATE INDEX IF NOT EXISTS idx_integracao_frete_data ON integracoes_totvs_calcula_frete (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integracao_frete_status ON integracoes_totvs_calcula_frete (status);

-- condicoes_pagamento
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_nome ON condicoes_pagamento (nome);

-- empresas
CREATE INDEX IF NOT EXISTS idx_empresas_ativa ON empresas (esta_ativa) WHERE excluido_em IS NULL;

-- =====================================================
-- FASE 6: ANALYZE em todas as tabelas afetadas
-- =====================================================

ANALYZE user_roles;
ANALYZE role_hierarquia;
ANALYZE equipes;
ANALYZE membros_equipe;
ANALYZE vendas;
ANALYZE vendas_itens;
ANALYZE pipelines;
ANALYZE whatsapp_webhooks_log;
ANALYZE whatsapp_conversas;
ANALYZE whatsapp_contas;
ANALYZE tickets;
ANALYZE perfis_usuario;
ANALYZE integracoes_totvs_calcula_frete;
ANALYZE condicoes_pagamento;
ANALYZE empresas;