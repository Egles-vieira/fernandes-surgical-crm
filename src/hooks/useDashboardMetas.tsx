import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

interface KPIsGerais {
  total_meta: number;
  total_realizado: number;
  percentual_atingimento: number;
  pacing: number;
  numero_equipes: number;
}

interface PacingSemanal {
  semana: string;
  data_semana: string;
  realizado: number;
  meta: number;
  projecao: number;
}

interface FunilVendas {
  etapa: string;
  quantidade: number;
  valor_total: number;
}

interface DistribuicaoMetas {
  equipe_nome: string;
  valor_objetivo: number;
  valor_atual: number;
  percentual: number;
}

export interface FiltrosDashboard {
  dataInicio?: Date;
  dataFim?: Date;
  equipeId?: string;
  vendedorId?: string;
}

export function useDashboardMetas(filtros: FiltrosDashboard = {}) {
  const inicio = filtros.dataInicio || startOfMonth(new Date());
  const fim = filtros.dataFim || endOfMonth(new Date());

  // KPIs Gerais
  const { data: kpis, isLoading: isLoadingKPIs } = useQuery({
    queryKey: ["dashboard-kpis", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_kpis_gerais_periodo", {
        p_data_inicio: inicio.toISOString(),
        p_data_fim: fim.toISOString(),
      });

      if (error) throw error;
      return data[0] as KPIsGerais;
    },
  });

  // Pacing Semanal
  const { data: pacing, isLoading: isLoadingPacing } = useQuery({
    queryKey: ["dashboard-pacing", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pacing_semanal", {
        p_periodo_inicio: inicio.toISOString(),
        p_periodo_fim: fim.toISOString(),
      });

      if (error) throw error;
      return data as PacingSemanal[];
    },
  });

  // Funil de Vendas
  const { data: funil, isLoading: isLoadingFunil } = useQuery({
    queryKey: ["dashboard-funil", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_funil_vendas", {
        p_periodo_inicio: inicio.toISOString(),
        p_periodo_fim: fim.toISOString(),
      });

      if (error) throw error;
      return data as FunilVendas[];
    },
  });

  // Distribuição de Metas por Equipe
  const { data: distribuicao, isLoading: isLoadingDistribuicao } = useQuery({
    queryKey: ["dashboard-distribuicao", inicio, fim, filtros.equipeId],
    queryFn: async () => {
      let query = supabase
        .from("metas_equipe")
        .select(
          `
          equipe_id,
          valor_objetivo,
          valor_atual,
          equipes!inner(nome)
        `
        )
        .eq("status", "ativa")
        .gte("periodo_inicio", inicio.toISOString())
        .lte("periodo_fim", fim.toISOString());

      if (filtros.equipeId) {
        query = query.eq("equipe_id", filtros.equipeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((meta: any) => ({
        equipe_nome: meta.equipes?.nome || "Sem equipe",
        valor_objetivo: meta.valor_objetivo,
        valor_atual: meta.valor_atual,
        percentual: meta.valor_objetivo > 0 ? (meta.valor_atual / meta.valor_objetivo) * 100 : 0,
      })) as DistribuicaoMetas[];
    },
  });

  return {
    kpis,
    pacing,
    funil,
    distribuicao,
    isLoading: isLoadingKPIs || isLoadingPacing || isLoadingFunil || isLoadingDistribuicao,
  };
}
