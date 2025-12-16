-- Função para listar todos os cron jobs
CREATE OR REPLACE FUNCTION public.listar_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar cron jobs';
  END IF;

  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  ORDER BY j.jobname;
END;
$$;

-- Função para habilitar um cron job
CREATE OR REPLACE FUNCTION public.habilitar_cron_job(p_jobid bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar cron jobs';
  END IF;

  UPDATE cron.job SET active = true WHERE jobid = p_jobid;
  RETURN true;
END;
$$;

-- Função para desabilitar um cron job
CREATE OR REPLACE FUNCTION public.desabilitar_cron_job(p_jobid bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar cron jobs';
  END IF;

  UPDATE cron.job SET active = false WHERE jobid = p_jobid;
  RETURN true;
END;
$$;

-- Função para atualizar um cron job
CREATE OR REPLACE FUNCTION public.atualizar_cron_job(
  p_jobid bigint,
  p_schedule text,
  p_command text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar cron jobs';
  END IF;

  UPDATE cron.job 
  SET schedule = p_schedule, command = p_command 
  WHERE jobid = p_jobid;
  
  RETURN true;
END;
$$;

-- Função para buscar histórico de execuções
CREATE OR REPLACE FUNCTION public.historico_cron_job(p_jobid bigint, p_limit integer DEFAULT 50)
RETURNS TABLE (
  runid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamp with time zone,
  end_time timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário é admin ou manager
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar histórico de cron jobs';
  END IF;

  RETURN QUERY
  SELECT 
    d.runid,
    d.job_pid,
    d.database,
    d.username,
    d.command,
    d.status,
    d.return_message,
    d.start_time,
    d.end_time
  FROM cron.job_run_details d
  WHERE d.jobid = p_jobid
  ORDER BY d.start_time DESC
  LIMIT p_limit;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.listar_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.habilitar_cron_job(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desabilitar_cron_job(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_cron_job(bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.historico_cron_job(bigint, integer) TO authenticated;