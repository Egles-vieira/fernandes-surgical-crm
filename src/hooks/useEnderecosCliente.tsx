import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type EnderecoCliente = Tables<"enderecos_clientes">;

export function useEnderecosCliente(clienteId: string | null | undefined) {
  const { data: enderecos, isLoading, refetch } = useQuery({
    queryKey: ["enderecos-cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from("enderecos_clientes")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("is_principal", { ascending: false })
        .order("tipo");

      if (error) throw error;
      return data as EnderecoCliente[];
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });

  return {
    enderecos: enderecos || [],
    isLoading,
    refetch,
  };
}
