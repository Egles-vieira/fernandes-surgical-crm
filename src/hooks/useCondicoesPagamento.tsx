import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCondicoesPagamento = () => {
  const { data: condicoes, isLoading } = useQuery({
    queryKey: ["condicoes_pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condicoes_pagamento")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  return { condicoes: condicoes || [], isLoading };
};
