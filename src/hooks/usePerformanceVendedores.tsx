import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceVendedor {
  vendedor_id: string;
  nome_vendedor: string;
  meta_valor: number;
  realizado_valor: number;
  percentual_atingimento: number;
  total_vendas: number;
  vendas_ganhas: number;
  vendas_perdidas: number;
  valor_vendido: number;
  ticket_medio: number;
  taxa_conversao: number;
  margem_media: number;
  probabilidade_media: number;
  equipe_id: string | null;
  equipe_nome: string | null;
}

export interface FiltrosPerformance {
  equipeId?: string;
  vendedorId?: string;
}

export function usePerformanceVendedores(filtros: FiltrosPerformance = {}) {
  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["performance-vendedores", filtros.equipeId, filtros.vendedorId],
    queryFn: async () => {
      let query = supabase
        .from("vw_performance_vendedor")
        .select("*")
        .order("percentual_atingimento", { ascending: false });

      if (filtros.equipeId) {
        query = query.eq("equipe_id", filtros.equipeId);
      }

      if (filtros.vendedorId) {
        query = query.eq("vendedor_id", filtros.vendedorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PerformanceVendedor[];
    },
  });

  return {
    vendedores,
    isLoading,
  };
}
