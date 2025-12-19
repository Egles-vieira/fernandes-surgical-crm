import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobRecalculo {
  id: string;
  oportunidade_id: string;
  status: string;
  tentativas: number;
  erro: string | null;
  criado_em: string;
  processado_em: string | null;
  descricao: string | null;
  tipo_job: string | null;
  regra: string | null;
}

export function useJobsRecalculo() {
  return useQuery({
    queryKey: ["jobs-recalculo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs_recalculo_oportunidade")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as JobRecalculo[];
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });
}

export function useJobsRecalculoStats() {
  return useQuery({
    queryKey: ["jobs-recalculo-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs_recalculo_oportunidade")
        .select("status");

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter((j) => j.status === "pending").length,
        processing: data.filter((j) => j.status === "processing").length,
        completed: data.filter((j) => j.status === "completed").length,
        failed: data.filter((j) => j.status === "failed").length,
      };

      return stats;
    },
    refetchInterval: 5000,
  });
}
