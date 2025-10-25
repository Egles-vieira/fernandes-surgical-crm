import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlataformasEDI() {
  const { data: plataformas, isLoading } = useQuery({
    queryKey: ["plataformas-edi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plataformas_edi")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  return { plataformas, isLoading };
}
