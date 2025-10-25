import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  total_cotacoes: number;
  total_analisadas: number;
  em_analise_agora: number;
  analises_concluidas: number;
  analises_com_erro: number;
  taxa_automacao_percent: number;
  tempo_medio_analise_seg: number;
  total_itens_cotacoes: number;
  total_itens_analisados: number;
  total_sugestoes_geradas: number;
  taxa_sugestoes_percent: number;
  analises_ultimos_7_dias: number;
  analises_ultimas_24h: number;
  taxa_erro_percent: number;
  modelo_mais_usado: string;
}

export interface AnalisePorDia {
  data: string;
  total_analises: number;
  analises_concluidas: number;
  analises_com_erro: number;
  tempo_medio_seg: number;
  total_sugestoes: number;
}

export interface ProdutoMaisSugerido {
  id: string;
  referencia_interna: string;
  nome: string;
  vezes_sugerido: number;
  score_medio: number;
  vezes_aceito: number;
  taxa_aceitacao_percent: number;
}

export const useDashboardIA = () => {
  const { data: metricas, isLoading: loadingMetricas } = useQuery({
    queryKey: ["dashboard-ia-metricas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_analise_ia_dashboard")
        .select("*")
        .single();

      if (error) throw error;
      return data as DashboardMetrics;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const { data: analisePorDia, isLoading: loadingAnaliseDiaria } = useQuery({
    queryKey: ["dashboard-ia-por-dia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_analise_ia_por_dia")
        .select("*")
        .limit(30);

      if (error) throw error;
      return data as AnalisePorDia[];
    },
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  const { data: produtosMaisSugeridos, isLoading: loadingProdutos } = useQuery({
    queryKey: ["dashboard-ia-produtos-sugeridos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_produtos_mais_sugeridos_ia")
        .select("*")
        .limit(10);

      if (error) throw error;
      return data as ProdutoMaisSugerido[];
    },
    refetchInterval: 120000, // Atualiza a cada 2 minutos
  });

  return {
    metricas,
    analisePorDia,
    produtosMaisSugeridos,
    isLoading: loadingMetricas || loadingAnaliseDiaria || loadingProdutos,
  };
};
