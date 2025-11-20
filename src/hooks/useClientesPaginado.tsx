import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes">;

interface UseClientesPaginadoParams {
  page: number;
  pageSize: number;
  searchTerm: string;
}

export function useClientesPaginado({ page, pageSize, searchTerm }: UseClientesPaginadoParams) {
  const { data, isLoading } = useQuery({
    queryKey: ["clientes-paginado", page, pageSize, searchTerm],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .order("nome_emit");

      // Aplicar filtro de busca se houver
      if (searchTerm) {
        query = query.or(`nome_abrev.ilike.%${searchTerm}%,cgc.ilike.%${searchTerm}%,nome_emit.ilike.%${searchTerm}%,cod_emitente.eq.${parseInt(searchTerm) || 0}`);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { clientes: data as Cliente[], total: count || 0 };
    },
  });

  return {
    clientes: data?.clientes || [],
    total: data?.total || 0,
    isLoading,
  };
}
