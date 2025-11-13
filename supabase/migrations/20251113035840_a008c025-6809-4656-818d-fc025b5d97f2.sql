-- Adicionar policy para permitir que usuários atualizem seu próprio status de atendimento
CREATE POLICY "Usuários podem atualizar próprio status de atendimento"
ON perfis_usuario
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Adicionar policy para permitir que usuários vejam status de outros usuários (para coordenação)
CREATE POLICY "Usuários podem ver status de atendimento de outros"
ON perfis_usuario
FOR SELECT
USING (auth.uid() IS NOT NULL);