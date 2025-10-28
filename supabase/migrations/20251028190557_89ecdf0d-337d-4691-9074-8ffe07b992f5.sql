-- Corrigir políticas RLS para permitir importação de XML

-- 1. Adicionar política INSERT para edi_logs_integracao (sistema pode registrar logs)
CREATE POLICY "Sistema pode inserir logs de integração"
ON edi_logs_integracao
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Permitir usuários autenticados visualizarem plataformas ativas (necessário para foreign key checks)
CREATE POLICY "Usuários podem visualizar plataformas ativas"
ON plataformas_edi
FOR SELECT
TO authenticated
USING (ativo = true);

-- 3. Garantir que service role pode fazer tudo (bypass RLS implícito, mas explicitando)
-- Edge functions com service role key já bypassam RLS, mas vamos garantir políticas corretas

-- Comentário explicativo:
-- A edge function edi-importar-xml usa service role key, que bypassa RLS
-- Mas quando usuários chamam a function através do frontend, 
-- o token de autenticação pode ser usado em algumas verificações internas
-- Por isso precisamos das políticas acima