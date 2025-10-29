-- Fix RLS on vendas_itens to allow inserts/updates/deletes when user is seller assigned to the parent venda OR owner via user_id
-- 1) Drop existing simplistic policies
DROP POLICY IF EXISTS "Users can create vendas_itens" ON public.vendas_itens;
DROP POLICY IF EXISTS "Users can delete vendas_itens" ON public.vendas_itens;
DROP POLICY IF EXISTS "Users can update vendas_itens" ON public.vendas_itens;
DROP POLICY IF EXISTS "Users can view their vendas_itens" ON public.vendas_itens;

-- 2) Create unified, consistent policies mirroring vendas access for common cases
-- Allow SELECT when current user owns the venda (user_id) OR is the assigned seller (vendedor_id)
CREATE POLICY "View itens by owner or seller" ON public.vendas_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (
        v.user_id = auth.uid()
        OR (public.has_role(auth.uid(), 'sales'::app_role) AND v.vendedor_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
      )
  )
);

-- Allow INSERT under same rules
CREATE POLICY "Insert itens by owner or seller" ON public.vendas_itens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (
        v.user_id = auth.uid()
        OR (public.has_role(auth.uid(), 'sales'::app_role) AND v.vendedor_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
      )
  )
);

-- Allow UPDATE under same rules
CREATE POLICY "Update itens by owner or seller" ON public.vendas_itens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (
        v.user_id = auth.uid()
        OR (public.has_role(auth.uid(), 'sales'::app_role) AND v.vendedor_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (
        v.user_id = auth.uid()
        OR (public.has_role(auth.uid(), 'sales'::app_role) AND v.vendedor_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
      )
  )
);

-- Allow DELETE under same rules
CREATE POLICY "Delete itens by owner or seller" ON public.vendas_itens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (
        v.user_id = auth.uid()
        OR (public.has_role(auth.uid(), 'sales'::app_role) AND v.vendedor_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
      )
  )
);
