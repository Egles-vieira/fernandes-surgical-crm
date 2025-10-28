import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseEDILogsParams {
  tipo?: string;
  operacao?: string;
  plataforma_id?: string;
  limite?: number;
  offset?: number;
}

export function useEDILogs({
  tipo = "importacao",
  operacao,
  plataforma_id,
  limite = 20,
  offset = 0,
}: UseEDILogsParams = {}) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["edi-logs", tipo, operacao, plataforma_id, limite, offset],
    queryFn: async () => {
      let query = supabase
        .from("edi_logs_integracao")
        .select(`
          *,
          plataformas_edi(nome, slug)
        `, { count: "exact" })
        .eq("tipo", tipo)
        .order("executado_em", { ascending: false })
        .range(offset, offset + limite - 1);

      if (operacao) {
        query = query.eq("operacao", operacao);
      }

      if (plataforma_id) {
        query = query.eq("plataforma_id", plataforma_id);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      return { logs: data, total: count || 0 };
    },
  });

  // Estatísticas
  const { data: stats } = useQuery({
    queryKey: ["edi-logs-stats", tipo, operacao, plataforma_id],
    queryFn: async () => {
      let query = supabase
        .from("edi_logs_integracao")
        .select("sucesso, executado_em", { count: "exact" })
        .eq("tipo", tipo);

      if (operacao) {
        query = query.eq("operacao", operacao);
      }

      if (plataforma_id) {
        query = query.eq("plataforma_id", plataforma_id);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const sucessos = data?.filter(log => log.sucesso).length || 0;
      const erros = (count || 0) - sucessos;
      
      // Últimas 24h
      const ultimasHoras = data?.filter(log => {
        const diff = Date.now() - new Date(log.executado_em).getTime();
        return diff < 24 * 60 * 60 * 1000;
      }).length || 0;

      return {
        total: count || 0,
        sucessos,
        erros,
        taxaSucesso: count ? (sucessos / count) * 100 : 0,
        ultimas24h: ultimasHoras,
      };
    },
  });

  return { 
    logs: logs?.logs || [], 
    total: logs?.total || 0,
    stats,
    isLoading 
  };
}
