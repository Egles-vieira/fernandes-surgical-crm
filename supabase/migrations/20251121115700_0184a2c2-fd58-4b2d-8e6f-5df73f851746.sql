-- Políticas RLS para tabela vendas
-- Permitir INSERT para usuários autenticados com seus próprios dados
CREATE POLICY "Usuários podem criar suas próprias vendas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  responsavel_id = auth.uid() OR vendedor_id = auth.uid()
);

-- Permitir SELECT para vendas que o usuário criou, é responsável ou é vendedor
CREATE POLICY "Usuários podem ver suas próprias vendas"
ON public.vendas
FOR SELECT
TO authenticated
USING (
  responsavel_id = auth.uid() 
  OR vendedor_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Permitir UPDATE para vendas que o usuário criou, é responsável ou é vendedor
CREATE POLICY "Usuários podem atualizar suas próprias vendas"
ON public.vendas
FOR UPDATE
TO authenticated
USING (
  responsavel_id = auth.uid() 
  OR vendedor_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
)
WITH CHECK (
  responsavel_id = auth.uid() 
  OR vendedor_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Permitir DELETE apenas para admins
CREATE POLICY "Apenas admins podem deletar vendas"
ON public.vendas
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);