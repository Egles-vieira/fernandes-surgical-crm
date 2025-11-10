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

export function usePerformanceVendedores() {
  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["performance-vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_performance_vendedor")
        .select("*")
        .order("percentual_atingimento", { ascending: false });

      if (error) throw error;
      return data as PerformanceVendedor[];
    },
  });

  return {
    vendedores,
    isLoading,
  };
}
