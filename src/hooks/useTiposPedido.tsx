import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTiposPedido = () => {
  const { data: tipos, isLoading } = useQuery({
    queryKey: ["tipos_pedido"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_pedido")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  return { tipos: tipos || [], isLoading };
};
