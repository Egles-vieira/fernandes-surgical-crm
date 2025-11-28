import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useMemo } from "react";
import { Tables } from "@/integrations/supabase/types";

type Venda = Tables<"vendas">;

export interface VendaListItem extends Pick<Venda, 
  "id" | "numero_venda" | "cliente_nome" | "cliente_cnpj" | 
  "valor_total" | "valor_final" | "status" | "etapa_pipeline" |
  "data_venda" | "created_at" | "responsavel_id" | "vendedor_id" |
  "probabilidade" | "valor_estimado" | "data_fechamento_prevista"
> {
  total_itens?: number;
}

export interface VendasFiltros {
  status?: string;
  etapa?: string;
  responsavel?: string;
  periodo?: string;
  searchTerm?: string;
}

interface UseVendasPaginadoOptions {
  pageSize?: number;
  enabled?: boolean;
}

export function useVendasPaginado(options: UseVendasPaginadoOptions = {}) {
  const { pageSize = 20, enabled = true } = options;
  
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState<VendasFiltros>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce handler
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    // Reset para página 1 ao buscar
    setPage(1);
    // Debounce de 300ms
    const timer = setTimeout(() => {
      setDebouncedSearch(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Query key estável baseada nos filtros
  const queryKey = useMemo(() => [
    "vendas-paginado",
    page,
    pageSize,
    debouncedSearch,
    filtros.status,
    filtros.etapa,
    filtros.responsavel,
    filtros.periodo,
  ], [page, pageSize, debouncedSearch, filtros]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular offset
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Construir query base
      let query = supabase
        .from("vendas")
        .select(`
          id,
          numero_venda,
          cliente_nome,
          cliente_cnpj,
          valor_total,
          valor_final,
          status,
          etapa_pipeline,
          data_venda,
          created_at,
          responsavel_id,
          vendedor_id,
          probabilidade,
          valor_estimado,
          data_fechamento_prevista
        `, { count: "exact" });

      // Aplicar filtros no banco (server-side)
      if (debouncedSearch) {
        query = query.or(`numero_venda.ilike.%${debouncedSearch}%,cliente_nome.ilike.%${debouncedSearch}%,cliente_cnpj.ilike.%${debouncedSearch}%`);
      }

      if (filtros.status && filtros.status !== "todos") {
        query = query.eq("status", filtros.status);
      }

      if (filtros.etapa && filtros.etapa !== "todos") {
        query = query.eq("etapa_pipeline", filtros.etapa as Tables<"vendas">["etapa_pipeline"]);
      }

      if (filtros.responsavel) {
        if (filtros.responsavel === "sem") {
          query = query.is("responsavel_id", null);
        } else if (filtros.responsavel !== "todos" && filtros.responsavel !== "eu") {
          query = query.eq("responsavel_id", filtros.responsavel);
        } else if (filtros.responsavel === "eu") {
          query = query.eq("responsavel_id", user.id);
        }
      }

      // Filtro de período
      if (filtros.periodo && filtros.periodo !== "todos") {
        const hoje = new Date();
        const dataInicio = new Date();
        
        switch (filtros.periodo) {
          case "hoje":
            dataInicio.setHours(0, 0, 0, 0);
            break;
          case "semana":
            dataInicio.setDate(hoje.getDate() - 7);
            break;
          case "mes":
            dataInicio.setMonth(hoje.getMonth() - 1);
            break;
          case "trimestre":
            dataInicio.setMonth(hoje.getMonth() - 3);
            break;
          case "ano":
            dataInicio.setFullYear(hoje.getFullYear() - 1);
            break;
        }
        
        query = query.gte("created_at", dataInicio.toISOString());
      }

      // Ordenação e paginação
      query = query
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data: vendas, error, count } = await query;

      if (error) throw error;

      return {
        vendas: vendas as VendaListItem[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
      };
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5,
  });

  // Handlers de navegação
  const nextPage = useCallback(() => {
    if (data && page < data.totalPages) {
      setPage(p => p + 1);
    }
  }, [data, page]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Handler de filtros
  const updateFiltros = useCallback((newFiltros: Partial<VendasFiltros>) => {
    setFiltros(prev => ({ ...prev, ...newFiltros }));
    setPage(1); // Reset para página 1 ao filtrar
  }, []);

  const resetFiltros = useCallback(() => {
    setFiltros({});
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

  return {
    // Data
    vendas: data?.vendas || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    currentPage: page,
    
    // Loading state
    isLoading,
    error,
    
    // Search
    searchTerm,
    setSearchTerm: handleSearchChange,
    
    // Filtros
    filtros,
    updateFiltros,
    resetFiltros,
    
    // Paginação
    nextPage,
    prevPage,
    goToPage,
    
    // Refetch
    refetch,
  };
}
