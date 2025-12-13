-- 1. Dropar política atual restritiva
DROP POLICY IF EXISTS "Admins e Managers podem gerenciar contas WhatsApp" ON whatsapp_contas;

-- 2. Criar política de leitura para todos os usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar contas WhatsApp"
ON whatsapp_contas
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. Criar políticas de modificação apenas para admins/managers
CREATE POLICY "Admins e Managers podem inserir contas WhatsApp"
ON whatsapp_contas
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins e Managers podem atualizar contas WhatsApp"
ON whatsapp_contas
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins e Managers podem excluir contas WhatsApp"
ON whatsapp_contas
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));