-- Criar função para executar cron job manualmente
CREATE OR REPLACE FUNCTION public.executar_cron_job_manual(p_jobid bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_command text;
BEGIN
  -- Buscar o comando do job
  SELECT command INTO v_command
  FROM cron.job
  WHERE jobid = p_jobid;

  IF v_command IS NULL THEN
    RAISE EXCEPTION 'Job não encontrado: %', p_jobid;
  END IF;

  -- Executar o comando SQL diretamente
  EXECUTE v_command;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.executar_cron_job_manual(bigint) TO authenticated;