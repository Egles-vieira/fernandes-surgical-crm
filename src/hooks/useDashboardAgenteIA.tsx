import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgenteIAResumo {
  total_sessoes: number;
  sessoes_ativas: number;
  oportunidades_criadas: number;
  total_tokens_entrada: number;
  total_tokens_saida: number;
  tempo_medio_tools_ms: number;
  total_erros: number;
  total_tools_executadas: number;
  ultima_atualizacao: string;
}

export interface SessaoPorEstado {
  estado_atual: string;
  quantidade: number;
  media_mensagens: number;
  media_tools: number;
}

export interface ToolPerformance {
  tool_name: string;
  total_chamadas: number;
  tempo_medio_ms: number;
  p95_ms: number;
  max_ms: number;
  total_erros: number;
  taxa_erro_percent: number;
}

export interface MetricaPorDia {
  data: string;
  sessoes: number;
  oportunidades: number;
  tokens_total: number;
  tools_executadas: number;
  erros: number;
}

export interface ProviderUso {
  provider: string;
  total_chamadas: number;
  tokens_entrada: number;
  tokens_saida: number;
  tempo_medio_ms: number;
}

export const useDashboardAgenteIA = (isActive: boolean = true) => {
  // Resumo geral (KPIs)
  const { data: resumo, isLoading: loadingResumo, refetch: refetchResumo } = useQuery({
    queryKey: ["agente-ia-resumo"],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("mv_agente_ia_resumo")
        .select("*")
        .single();

      if (error) throw error;
      return data as AgenteIAResumo;
    },
    enabled: isActive,
    refetchInterval: 60000, // 1 min
    staleTime: 30000,
  });

  // Sessões por estado do funil
  const { data: sessoesPorEstado, isLoading: loadingSessoes } = useQuery({
    queryKey: ["agente-ia-sessoes-estado"],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("mv_agente_sessoes_por_estado")
        .select("*");

      if (error) throw error;
      return (data || []) as SessaoPorEstado[];
    },
    enabled: isActive,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Performance das tools
  const { data: toolsPerformance, isLoading: loadingTools } = useQuery({
    queryKey: ["agente-ia-tools-performance"],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("mv_agente_tools_performance")
        .select("*")
        .order("total_chamadas", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as ToolPerformance[];
    },
    enabled: isActive,
    refetchInterval: 120000, // 2 min
    staleTime: 60000,
  });

  // Métricas por dia (últimos 14 dias)
  const { data: metricasPorDia, isLoading: loadingDiario } = useQuery({
    queryKey: ["agente-ia-por-dia"],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("mv_agente_por_dia")
        .select("*")
        .order("data", { ascending: true })
        .limit(14);

      if (error) throw error;
      return (data || []) as MetricaPorDia[];
    },
    enabled: isActive,
    refetchInterval: 120000,
    staleTime: 60000,
  });

  // Uso de providers LLM
  const { data: providersUso, isLoading: loadingProviders } = useQuery({
    queryKey: ["agente-ia-providers"],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("mv_agente_providers_uso")
        .select("*");

      if (error) throw error;
      return (data || []) as ProviderUso[];
    },
    enabled: isActive,
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const refreshAll = async () => {
    await refetchResumo();
  };

  return {
    resumo,
    sessoesPorEstado,
    toolsPerformance,
    metricasPorDia,
    providersUso,
    isLoading: loadingResumo || loadingSessoes || loadingTools || loadingDiario || loadingProviders,
    refreshAll,
  };
};
