import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

export interface CronJobHistory {
  runid: number;
  job_pid: number;
  database: string;
  username: string;
  command: string;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
}

// Converte cron schedule para formato legível
export function formatCronSchedule(schedule: string): string {
  const parts = schedule.split(' ');
  
  // Casos comuns
  if (schedule === '* * * * *') return 'A cada minuto';
  if (schedule === '*/5 * * * *') return 'A cada 5 minutos';
  if (schedule === '*/10 * * * *') return 'A cada 10 minutos';
  if (schedule === '*/15 * * * *') return 'A cada 15 minutos';
  if (schedule === '*/30 * * * *') return 'A cada 30 minutos';
  if (schedule === '0 * * * *') return 'A cada hora';
  if (schedule === '0 */6 * * *') return 'A cada 6 horas';
  if (schedule === '0 */12 * * *') return 'A cada 12 horas';
  if (schedule === '0 0 * * *') return 'Diariamente à meia-noite';
  
  // Segundos (extensão pg_cron)
  if (parts.length === 1 && schedule.includes('seconds')) {
    const match = schedule.match(/(\d+)\s*seconds?/);
    if (match) return `A cada ${match[1]} segundos`;
  }

  // Formato */N segundos
  if (schedule.match(/^\*\/\d+$/)) {
    const seconds = schedule.replace('*/', '');
    return `A cada ${seconds} segundos`;
  }

  // Horário específico diário
  if (parts.length >= 5) {
    const [min, hour] = parts;
    if (min.match(/^\d+$/) && hour.match(/^\d+$/) && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
      return `Diariamente às ${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;
    }
  }

  return schedule;
}

// Calcula duração em formato legível
export function formatDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '-';
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`;
  
  return `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;
}

export function useCronJobs() {
  const queryClient = useQueryClient();

  // Listar todos os cron jobs
  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('listar_cron_jobs');
      if (error) throw error;
      return data as CronJob[];
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Habilitar job
  const habilitarMutation = useMutation({
    mutationFn: async (jobid: number) => {
      const { error } = await supabase.rpc('habilitar_cron_job', { p_jobid: jobid });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job habilitado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao habilitar cron job: ${error.message}`);
    },
  });

  // Desabilitar job
  const desabilitarMutation = useMutation({
    mutationFn: async (jobid: number) => {
      const { error } = await supabase.rpc('desabilitar_cron_job', { p_jobid: jobid });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job desabilitado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desabilitar cron job: ${error.message}`);
    },
  });

  // Atualizar job
  const atualizarMutation = useMutation({
    mutationFn: async ({ jobid, schedule, command }: { jobid: number; schedule: string; command: string }) => {
      const { error } = await supabase.rpc('atualizar_cron_job', { 
        p_jobid: jobid, 
        p_schedule: schedule, 
        p_command: command 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cron job: ${error.message}`);
    },
  });

  // Executar job manualmente
  const executarMutation = useMutation({
    mutationFn: async (jobid: number) => {
      const { error } = await supabase.rpc('executar_cron_job_manual' as any, { p_jobid: jobid });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['cron-job-history'] });
      toast.success('Cron job executado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao executar cron job: ${error.message}`);
    },
  });

  // Buscar histórico de um job
  const useJobHistory = (jobid: number | null, limit = 50) => {
    return useQuery({
      queryKey: ['cron-job-history', jobid],
      queryFn: async () => {
        if (!jobid) return [];
        const { data, error } = await supabase.rpc('historico_cron_job', { 
          p_jobid: jobid, 
          p_limit: limit 
        });
        if (error) throw error;
        return data as CronJobHistory[];
      },
      enabled: !!jobid,
      staleTime: 10000,
    });
  };

  return {
    jobs,
    isLoading,
    error,
    refetch,
    habilitar: habilitarMutation.mutate,
    desabilitar: desabilitarMutation.mutate,
    atualizar: atualizarMutation.mutate,
    executar: executarMutation.mutate,
    isHabilitando: habilitarMutation.isPending,
    isDesabilitando: desabilitarMutation.isPending,
    isAtualizando: atualizarMutation.isPending,
    isExecutando: executarMutation.isPending,
    useJobHistory,
  };
}
