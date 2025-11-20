import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

interface UseProdutosPaginadoParams {
  page: number;
  pageSize: number;
  searchTerm: string;
}

export function useProdutosPaginado({ page, pageSize, searchTerm }: UseProdutosPaginadoParams) {
  const { data, isLoading } = useQuery({
    queryKey: ["produtos-paginado", page, pageSize, searchTerm],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("produtos")
        .select("*", { count: "exact" })
        .order("nome");

      // Aplicar filtro de busca se houver
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,referencia_interna.ilike.%${searchTerm}%`);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { produtos: data as Produto[], total: count || 0 };
    },
  });

  return {
    produtos: data?.produtos || [],
    total: data?.total || 0,
    isLoading,
  };
}
