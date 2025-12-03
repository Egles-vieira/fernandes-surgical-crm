-- =====================================================
-- PRIORIDADE 1: OTIMIZAÇÃO RLS COM JWT CLAIMS
-- =====================================================

-- Função para definir claims customizados no JWT do usuário
-- Isso será usado pelo hook de autenticação para popular claims
CREATE OR REPLACE FUNCTION public.get_user_claims(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'user_id', _user_id,
    'roles', COALESCE((
      SELECT array_agg(role::text) 
      FROM public.user_roles 
      WHERE user_id = _user_id
    ), ARRAY[]::text[]),
    'equipes_ids', COALESCE((
      SELECT array_agg(equipe_id::text)
      FROM public.membros_equipe
      WHERE usuario_id = _user_id
    ), ARRAY[]::text[]),
    'equipes_gerenciadas', COALESCE((
      SELECT array_agg(id::text)
      FROM public.equipes
      WHERE (gestor_id = _user_id OR lider_equipe_id = _user_id)
        AND esta_ativa = true
    ), ARRAY[]::text[]),
    'is_admin', EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'),
    'is_manager', EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'manager')
  );
$$;

-- Função helper para verificar roles via JWT claims (mais performática)
CREATE OR REPLACE FUNCTION public.auth_has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->'roles') ? _role,
      EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role::app_role)
    );
$$;

-- Função helper para verificar se é admin via JWT claims
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->>'is_admin')::boolean,
      EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
$$;

-- Função helper para verificar se é manager via JWT claims  
CREATE OR REPLACE FUNCTION public.auth_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->>'is_manager')::boolean,
      EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'manager')
    );
$$;

-- =====================================================
-- PRIORIDADE 3: RPC BATCH UPDATE PARA EDGE FUNCTIONS
-- =====================================================

-- RPC para batch update de vendas_itens (evita N queries sequenciais)
CREATE OR REPLACE FUNCTION public.batch_update_vendas_itens(
  p_venda_id uuid,
  p_items jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_record jsonb;
  updated_count integer := 0;
BEGIN
  -- Iterar sobre cada item no array JSON
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE public.vendas_itens
    SET 
      datasul_dep_exp = NULLIF((item_record->>'datasul_dep_exp')::numeric, 0),
      datasul_custo = NULLIF((item_record->>'datasul_custo')::numeric, 0),
      datasul_divisao = NULLIF((item_record->>'datasul_divisao')::numeric, 0),
      datasul_vl_tot_item = NULLIF((item_record->>'datasul_vl_tot_item')::numeric, 0),
      datasul_vl_merc_liq = NULLIF((item_record->>'datasul_vl_merc_liq')::numeric, 0),
      datasul_lote_mulven = NULLIF((item_record->>'datasul_lote_mulven')::numeric, 0)
    WHERE venda_id = p_venda_id
      AND sequencia_item = (item_record->>'sequencia_item')::integer;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- RPC para batch insert de itens de venda (usado pelo ItensPropostaSheet)
CREATE OR REPLACE FUNCTION public.batch_insert_vendas_itens(
  p_items jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO public.vendas_itens (
    venda_id,
    produto_id,
    sequencia_item,
    quantidade,
    preco_unitario,
    preco_tabela,
    desconto,
    valor_total
  )
  SELECT 
    (item->>'venda_id')::uuid,
    (item->>'produto_id')::uuid,
    (item->>'sequencia_item')::integer,
    (item->>'quantidade')::numeric,
    (item->>'preco_unitario')::numeric,
    (item->>'preco_tabela')::numeric,
    COALESCE((item->>'desconto')::numeric, 0),
    (item->>'valor_total')::numeric
  FROM jsonb_array_elements(p_items) AS item;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_claims(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_vendas_itens(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.batch_insert_vendas_itens(jsonb) TO authenticated, service_role;