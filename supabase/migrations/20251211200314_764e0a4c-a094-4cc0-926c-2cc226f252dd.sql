-- Permitir INSERT público para formulário de contato comercial (usuários não autenticados)
CREATE POLICY "Permitir insert publico para solicitacoes" 
ON public.solicitacoes_cadastro 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);