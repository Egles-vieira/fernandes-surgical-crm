import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendedorDisponivel {
  user_id: string;
  nome_completo: string;
  esta_disponivel: boolean;
  max_conversas_simultaneas: number;
  horario_trabalho_inicio: string;
  horario_trabalho_fim: string;
  conversas_ativas: number;
  conversas_disponiveis: number;
  pode_receber_conversa: boolean;
}

export function useVendedoresDisponiveis() {
  return useQuery({
    queryKey: ["vendedores-disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_vendedores_disponiveis")
        .select("*")
        .order("conversas_ativas", { ascending: true });

      if (error) throw error;
      return data as VendedorDisponivel[];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
}
