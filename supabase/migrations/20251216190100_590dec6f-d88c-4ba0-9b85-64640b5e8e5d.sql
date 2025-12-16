-- Política para permitir admins/gerentes atualizarem filas de atendimento de qualquer operador
CREATE POLICY "Admins e gerentes podem gerenciar filas de operadores"
ON public.perfis_usuario
FOR UPDATE
USING (
  auth_is_admin() OR auth_is_manager()
)
WITH CHECK (
  auth_is_admin() OR auth_is_manager()
);