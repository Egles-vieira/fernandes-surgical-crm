import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendaEntrega {
  id: string;
  venda_id: string;
  codigo_rastreio: string | null;
  transportadora_nome: string | null;
  transportadora_cnpj: string | null;
  status_entrega: 'pendente' | 'em_transito' | 'entregue' | 'devolvido' | 'cancelado';
  data_previsao: string | null;
  data_entrega: string | null;
  url_rastreio: string | null;
  observacoes: string | null;
  peso_kg: number | null;
  volumes: number | null;
  created_at: string;
  updated_at: string;
}

export function useVendasEntregas(vendaId: string | undefined) {
  return useQuery({
    queryKey: ['vendas-entregas', vendaId],
    queryFn: async (): Promise<VendaEntrega[]> => {
      if (!vendaId) return [];
      
      const { data, error } = await supabase
        .from('vendas_entregas')
        .select('*')
        .eq('venda_id', vendaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VendaEntrega[];
    },
    enabled: !!vendaId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useVendasEntregasCount(vendaId: string | undefined) {
  return useQuery({
    queryKey: ['vendas-entregas-count', vendaId],
    queryFn: async (): Promise<number> => {
      if (!vendaId) return 0;
      
      const { count, error } = await supabase
        .from('vendas_entregas')
        .select('*', { count: 'exact', head: true })
        .eq('venda_id', vendaId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!vendaId,
    staleTime: 1000 * 60 * 2,
  });
}
