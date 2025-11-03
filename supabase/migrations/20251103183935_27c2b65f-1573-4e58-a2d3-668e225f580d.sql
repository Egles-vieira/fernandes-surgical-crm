-- Adicionar política para permitir a função handle_new_user inserir perfis
CREATE POLICY "Sistema pode criar perfis para novos usuários"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);