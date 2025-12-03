-- =====================================================
-- CRIAR ÍNDICES COMPOSTOS ESTRATÉGICOS (CORRIGIDO)
-- =====================================================

-- Índice composto para vendas (otimiza RLS e queries frequentes)
CREATE INDEX IF NOT EXISTS idx_vendas_rls_otimizado 
ON vendas (vendedor_id, user_id, cliente_id);

-- Índice para filtros de etapa/status (muito usado em pipeline)
CREATE INDEX IF NOT EXISTS idx_vendas_etapa_status 
ON vendas (etapa_pipeline, status);

-- Índice para membros_equipe (usado em JOINs de RLS)
CREATE INDEX IF NOT EXISTS idx_membros_equipe_usuario_ativo 
ON membros_equipe (usuario_id, esta_ativo) 
WHERE esta_ativo = true;

-- Índice composto para user_roles (elimina seq scans na verificação de roles)
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
ON user_roles (user_id, role);

-- Índice para role_hierarquia (reduz seq scans)
CREATE INDEX IF NOT EXISTS idx_role_hierarquia_lookup 
ON role_hierarquia (role, nivel);

-- Índice para tickets (4.1% idx ratio atual)
CREATE INDEX IF NOT EXISTS idx_tickets_rls_otimizado 
ON tickets (aberto_por, atribuido_para, status);

-- Índice para condicoes_pagamento (17.3% idx ratio)
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_codigo 
ON condicoes_pagamento (codigo_integracao);

-- Índice para solicitacoes_cadastro (24.6% idx ratio)
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cadastro_status 
ON solicitacoes_cadastro (status, criado_por);

-- Índice para whatsapp_webhooks_log (0.1% idx ratio) - usando coluna correta
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_log_conta 
ON whatsapp_webhooks_log (whatsapp_conta_id, recebido_em DESC);

-- =====================================================
-- ANALYZE PARA ATUALIZAR ESTATÍSTICAS
-- =====================================================

ANALYZE vendas;
ANALYZE membros_equipe;
ANALYZE user_roles;
ANALYZE role_hierarquia;
ANALYZE tickets;
ANALYZE condicoes_pagamento;
ANALYZE solicitacoes_cadastro;
ANALYZE whatsapp_webhooks_log;