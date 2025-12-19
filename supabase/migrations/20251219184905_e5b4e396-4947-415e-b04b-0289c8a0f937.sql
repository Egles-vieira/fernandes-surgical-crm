
-- Recriar função para usar cron.alter_job ao invés de UPDATE direto
CREATE OR REPLACE FUNCTION public.desabilitar_cron_job(p_jobid bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar cron jobs';
  END IF;

  -- Usar cron.alter_job para desabilitar (método correto do pg_cron)
  PERFORM cron.alter_job(
    job_id := p_jobid,
    active := false
  );
  
  RETURN true;
END;
$$;

-- Recriar função habilitar também
CREATE OR REPLACE FUNCTION public.habilitar_cron_job(p_jobid bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar cron jobs';
  END IF;

  -- Usar cron.alter_job para habilitar
  PERFORM cron.alter_job(
    job_id := p_jobid,
    active := true
  );
  
  RETURN true;
END;
$$;

-- Recriar função atualizar também
CREATE OR REPLACE FUNCTION public.atualizar_cron_job(
  p_jobid bigint, 
  p_schedule text, 
  p_command text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar cron jobs';
  END IF;

  -- Usar cron.alter_job para atualizar
  PERFORM cron.alter_job(
    job_id := p_jobid,
    schedule := p_schedule,
    command := p_command
  );
  
  RETURN true;
END;
$$;
