import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

interface ProdutoBuscaAvancada extends Produto {
  ja_vendido: boolean;
  ultima_venda: string | null;
  valor_ultima_proposta: number | null;
}

interface UseProdutosBuscaAvancadaParams {
  page: number;
  pageSize: number;
  searchTerm: string;
  apenasComEstoque: boolean;
  jaVendi: boolean;
  clienteId: string | null;
  idsExcluir: string[];
  enabled?: boolean;
}

export function useProdutosBuscaAvancada({
  page,
  pageSize,
  searchTerm,
  apenasComEstoque,
  jaVendi,
  clienteId,
  idsExcluir,
  enabled = true,
}: UseProdutosBuscaAvancadaParams) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "produtos-busca-avancada",
      page,
      pageSize,
      searchTerm,
      apenasComEstoque,
      jaVendi,
      clienteId,
      idsExcluir,
    ],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Busca base de produtos
      let query = supabase
        .from("produtos")
        .select("*", { count: "exact" })
        .order("nome");

      // Filtro de busca por texto
      if (searchTerm) {
        const normalizedSearch = searchTerm
          .replace(/,/g, ".")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        query = query.or(
          `nome.ilike.%${normalizedSearch}%,referencia_interna.ilike.%${normalizedSearch}%`
        );
      }

      // Filtro apenas com estoque
      if (apenasComEstoque) {
        query = query.gt("quantidade_em_maos", 0);
      }

      // Excluir IDs já na proposta
      if (idsExcluir.length > 0) {
        query = query.not("id", "in", `(${idsExcluir.join(",")})`);
      }

      query = query.range(from, to);

      const { data: produtos, error, count } = await query;

      if (error) throw error;

      // Se precisamos filtrar por "já vendi" e temos clienteId
      let produtosComHistorico: ProdutoBuscaAvancada[] = [];

      if (clienteId && produtos && produtos.length > 0) {
        // Buscar histórico de vendas para este cliente
        const { data: historicoVendas } = await supabase
          .from("vendas_itens")
          .select(
            `
            produto_id,
            preco_unitario,
            vendas!inner(
              cliente_id,
              created_at
            )
          `
          )
          .eq("vendas.cliente_id", clienteId)
          .in(
            "produto_id",
            produtos.map((p) => p.id)
          );

        // Agrupar por produto_id
        const historicoMap = new Map<
          string,
          { ultima_venda: string; valor_ultima_proposta: number }
        >();
        if (historicoVendas) {
          historicoVendas.forEach((item: any) => {
            const produtoId = item.produto_id;
            const vendaDate = item.vendas?.created_at;
            const existing = historicoMap.get(produtoId);
            if (!existing || new Date(vendaDate) > new Date(existing.ultima_venda)) {
              historicoMap.set(produtoId, {
                ultima_venda: vendaDate,
                valor_ultima_proposta: item.preco_unitario,
              });
            }
          });
        }

        produtosComHistorico = produtos.map((p) => {
          const historico = historicoMap.get(p.id);
          return {
            ...p,
            ja_vendido: !!historico,
            ultima_venda: historico?.ultima_venda || null,
            valor_ultima_proposta: historico?.valor_ultima_proposta || null,
          };
        });

        // Se filtro "já vendi" está ativo, filtrar apenas produtos com histórico
        if (jaVendi) {
          produtosComHistorico = produtosComHistorico.filter((p) => p.ja_vendido);
        }
      } else {
        produtosComHistorico = (produtos || []).map((p) => ({
          ...p,
          ja_vendido: false,
          ultima_venda: null,
          valor_ultima_proposta: null,
        }));
      }

      return {
        produtos: produtosComHistorico,
        total: jaVendi && clienteId ? produtosComHistorico.length : count || 0,
        totalPages: Math.ceil((jaVendi && clienteId ? produtosComHistorico.length : count || 0) / pageSize),
      };
    },
    enabled,
    staleTime: 30000, // 30 segundos
    gcTime: 60000, // 1 minuto
  });

  return {
    produtos: data?.produtos || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isFetching,
  };
}
