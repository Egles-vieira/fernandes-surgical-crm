import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendaNotaFiscal {
  id: string;
  venda_id: string;
  numero_nf: string;
  serie_nf: string | null;
  chave_acesso: string | null;
  data_emissao: string;
  valor_total: number;
  status: 'emitida' | 'cancelada' | 'denegada' | 'inutilizada';
  url_danfe: string | null;
  url_xml: string | null;
  natureza_operacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export function useVendasNotasFiscais(vendaId: string | undefined) {
  return useQuery({
    queryKey: ['vendas-notas-fiscais', vendaId],
    queryFn: async (): Promise<VendaNotaFiscal[]> => {
      if (!vendaId) return [];
      
      const { data, error } = await supabase
        .from('vendas_notas_fiscais')
        .select('*')
        .eq('venda_id', vendaId)
        .order('data_emissao', { ascending: false });

      if (error) throw error;
      return (data || []) as VendaNotaFiscal[];
    },
    enabled: !!vendaId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useVendasNotasFiscaisCount(vendaId: string | undefined) {
  return useQuery({
    queryKey: ['vendas-notas-fiscais-count', vendaId],
    queryFn: async (): Promise<number> => {
      if (!vendaId) return 0;
      
      const { count, error } = await supabase
        .from('vendas_notas_fiscais')
        .select('*', { count: 'exact', head: true })
        .eq('venda_id', vendaId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!vendaId,
    staleTime: 1000 * 60 * 2,
  });
}
