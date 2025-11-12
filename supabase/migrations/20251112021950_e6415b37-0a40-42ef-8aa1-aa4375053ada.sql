-- Adicionar coluna cliente_id na tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas(cliente_id);

-- Dropar a policy antiga de INSERT em vendas
DROP POLICY IF EXISTS "Criar vendas - hierarquia + admin + backoffice" ON public.vendas;

-- Criar nova policy usando cliente_id padronizado
CREATE POLICY "Criar vendas - hierarquia + admin + backoffice"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (get_nivel_hierarquico(auth.uid()) IS NOT NULL AND get_nivel_hierarquico(auth.uid()) <= 3)
  OR can_access_cliente(auth.uid(), cliente_id)
  OR (EXISTS (
        SELECT 1
        FROM public.clientes c
        WHERE c.id = public.vendas.cliente_id
          AND c.vendedor_id = auth.uid()
      ))
);