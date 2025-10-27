-- Corrigir a função list_users_with_roles para retornar tipos corretos
DROP FUNCTION IF EXISTS public.list_users_with_roles();

CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE(
  user_id uuid,
  email text,
  roles app_role[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário atual é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list all users';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,  -- Cast explícito para text
    array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE u.deleted_at IS NULL
  GROUP BY u.id, u.email
  ORDER BY u.email;
END;
$$;