import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropostaLista {
  id: string;
  tipo_origem: string;
  codigo: string | null;
  nome: string | null;
  cliente_nome: string | null;
  cliente_cnpj: string | null;
  valor: number | null;
  percentual_probabilidade: number | null;
  esta_fechada: boolean | null;
  foi_ganha: boolean | null;
  data_fechamento: string | null;
  origem_lead: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  pipeline_id: string | null;
  pipeline_nome: string | null;
  pipeline_cor: string | null;
  estagio_id: string | null;
  nome_estagio: string | null;
  estagio_cor: string | null;
  ordem_estagio: number | null;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  vendedor_avatar: string | null;
  codigo_vendedor: string | null;
  token_id: string | null;
  public_token: string | null;
  token_ativo: boolean | null;
  token_expira_em: string | null;
  link_criado_em: string | null;
  total_visualizacoes: number;
  visualizacoes_unicas: number;
  ultima_visualizacao_em: string | null;
  tempo_total_segundos: number;
  ultima_resposta: string | null;
  resposta_em: string | null;
  nome_respondente: string | null;
  status_proposta: string;
}

export interface UsePropostasListaOptions {
  enabled?: boolean;
  pipelineFilter?: string | null;
  vendedorFilter?: string | null;
  statusFilter?: string | null;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export function usePropostasLista(options: UsePropostasListaOptions = {}) {
  const {
    enabled = true,
    pipelineFilter = null,
    vendedorFilter = null,
    statusFilter = null,
    searchQuery = "",
    page = 1,
    pageSize = 50,
    orderBy = "criado_em",
    orderDirection = "desc",
  } = options;

  const offset = (page - 1) * pageSize;

  const query = useQuery({
    queryKey: [
      "propostas-lista",
      pipelineFilter,
      vendedorFilter,
      statusFilter,
      searchQuery,
      page,
      pageSize,
      orderBy,
      orderDirection,
    ],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("vw_propostas_lista")
        .select("*", { count: "exact" });

      // Aplicar filtros
      if (pipelineFilter) {
        queryBuilder = queryBuilder.eq("pipeline_id", pipelineFilter);
      }

      if (vendedorFilter) {
        queryBuilder = queryBuilder.eq("vendedor_id", vendedorFilter);
      }

      if (statusFilter) {
        queryBuilder = queryBuilder.eq("status_proposta", statusFilter);
      }

      if (searchQuery) {
        queryBuilder = queryBuilder.or(
          `cliente_nome.ilike.%${searchQuery}%,codigo.ilike.%${searchQuery}%,nome.ilike.%${searchQuery}%`
        );
      }

      // Ordenação
      queryBuilder = queryBuilder.order(orderBy, { ascending: orderDirection === "asc" });

      // Paginação
      queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

      const { data, error, count } = await queryBuilder;

      if (error) throw error;

      return {
        data: (data || []) as PropostaLista[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
      };
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  return {
    propostas: query.data?.data || [],
    totalCount: query.data?.totalCount || 0,
    totalPages: query.data?.totalPages || 0,
    currentPage: query.data?.currentPage || 1,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
