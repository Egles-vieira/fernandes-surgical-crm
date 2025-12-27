import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types para as Materialized Views
export interface PipelinesKPIs {
  total_pipelines: number;
  total_oportunidades: number;
  oportunidades_abertas: number;
  oportunidades_ganhas: number;
  oportunidades_perdidas: number;
  valor_total_pipeline: number;
  valor_em_aberto: number;
  valor_ganho: number;
  valor_ponderado: number;
  taxa_conversao: number;
  ticket_medio: number;
  atualizado_em: string;
}

export interface MetricasPipeline {
  pipeline_id: string;
  nome: string;
  cor: string | null;
  icone: string | null;
  tipo_pipeline: string | null;
  ordem_exibicao: number;
  total_oportunidades: number;
  abertas: number;
  ganhas: number;
  perdidas: number;
  valor_total: number;
  valor_aberto: number;
  valor_ganho: number;
  valor_ponderado: number;
  taxa_conversao: number;
}

export interface MetricasEstagio {
  estagio_id: string;
  nome_estagio: string;
  cor: string | null;
  ordem_estagio: number;
  percentual_probabilidade: number;
  pipeline_id: string;
  pipeline_nome: string;
  pipeline_cor: string | null;
  total_oportunidades: number;
  valor_total: number;
  valor_ponderado: number;
  media_dias_estagio: number;
}

export interface EvolucaoMensal {
  pipeline_id: string;
  pipeline_nome: string;
  cor: string | null;
  mes: string;
  mes_abrev: string;
  ordem_mes: number;
  novas_oportunidades: number;
  ganhas: number;
  valor_criado: number;
  valor_ganho: number;
}

interface UseDashboardPipelinesOptions {
  enabled?: boolean;
  pipelineFilter?: string | null;
}

export function useDashboardPipelines(options: UseDashboardPipelinesOptions = {}) {
  const { enabled = true, pipelineFilter = null } = options;
  const queryClient = useQueryClient();
  const staleTime = 5 * 60 * 1000; // 5 minutos

  // KPIs consolidados de todos os pipelines
  const kpisQuery = useQuery({
    queryKey: ["dashboard-pipelines-kpis"],
    queryFn: async (): Promise<PipelinesKPIs | null> => {
      const { data, error } = await supabase
        .from("mv_pipelines_kpis")
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao buscar KPIs de pipelines:", error);
        return null;
      }
      return data;
    },
    enabled,
    staleTime,
    refetchOnWindowFocus: false,
  });

  // Métricas por pipeline individual
  const pipelinesQuery = useQuery({
    queryKey: ["dashboard-pipelines-metricas"],
    queryFn: async (): Promise<MetricasPipeline[]> => {
      const { data, error } = await supabase
        .from("mv_metricas_por_pipeline")
        .select("*")
        .order("ordem_exibicao", { ascending: true });

      if (error) {
        console.error("Erro ao buscar métricas por pipeline:", error);
        return [];
      }
      return data || [];
    },
    enabled,
    staleTime,
    refetchOnWindowFocus: false,
  });

  // Métricas por estágio (com filtro opcional por pipeline)
  const estagiosQuery = useQuery({
    queryKey: ["dashboard-pipelines-estagios", pipelineFilter],
    queryFn: async (): Promise<MetricasEstagio[]> => {
      let query = supabase
        .from("mv_metricas_por_estagio")
        .select("*")
        .order("ordem_estagio", { ascending: true });

      if (pipelineFilter) {
        query = query.eq("pipeline_id", pipelineFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar métricas por estágio:", error);
        return [];
      }
      return data || [];
    },
    enabled,
    staleTime,
    refetchOnWindowFocus: false,
  });

  // Evolução mensal por pipeline
  const evolucaoQuery = useQuery({
    queryKey: ["dashboard-pipelines-evolucao", pipelineFilter],
    queryFn: async (): Promise<EvolucaoMensal[]> => {
      let query = supabase
        .from("mv_evolucao_mensal_pipeline")
        .select("*")
        .order("ordem_mes", { ascending: true });

      if (pipelineFilter) {
        query = query.eq("pipeline_id", pipelineFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar evolução mensal:", error);
        return [];
      }
      return data || [];
    },
    enabled,
    staleTime,
    refetchOnWindowFocus: false,
  });

  // Função para refresh manual das MVs
  const refreshMVs = async () => {
    try {
      await supabase.rpc("refresh_mv_pipelines");
      // Invalidar todas as queries após refresh
      queryClient.invalidateQueries({ queryKey: ["dashboard-pipelines-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pipelines-metricas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pipelines-estagios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pipelines-evolucao"] });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar MVs:", error);
      return false;
    }
  };

  // Dados agregados para gráficos
  const evolucaoAgregada = (evolucaoQuery.data || []).reduce<Record<string, any>>((acc, item) => {
    if (!acc[item.mes]) {
      acc[item.mes] = {
        mes: item.mes_abrev,
        ordem_mes: item.ordem_mes,
        total_valor: 0,
        total_oportunidades: 0,
      };
    }
    acc[item.mes].total_valor += Number(item.valor_criado) || 0;
    acc[item.mes].total_oportunidades += item.novas_oportunidades || 0;
    return acc;
  }, {});

  const evolucaoChartData = Object.values(evolucaoAgregada)
    .sort((a: any, b: any) => a.ordem_mes - b.ordem_mes);

  return {
    // Dados
    kpis: kpisQuery.data,
    pipelines: pipelinesQuery.data || [],
    estagios: estagiosQuery.data || [],
    evolucao: evolucaoQuery.data || [],
    evolucaoChartData,
    
    // Estados de loading
    isLoading: kpisQuery.isLoading || pipelinesQuery.isLoading,
    isLoadingEstagios: estagiosQuery.isLoading,
    isLoadingEvolucao: evolucaoQuery.isLoading,
    
    // Estados de erro
    isError: kpisQuery.isError || pipelinesQuery.isError,
    
    // Funções
    refreshMVs,
    refetch: () => {
      kpisQuery.refetch();
      pipelinesQuery.refetch();
      estagiosQuery.refetch();
      evolucaoQuery.refetch();
    },
  };
}
