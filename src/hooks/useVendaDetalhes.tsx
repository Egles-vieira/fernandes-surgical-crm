import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Venda = Tables<"vendas">;
type VendaItem = Tables<"vendas_itens">;
type Produto = Tables<"produtos">;
type VendaInsert = Omit<TablesInsert<"vendas">, "user_id">;
type VendaItemInsert = TablesInsert<"vendas_itens">;

export interface VendaComItens extends Venda {
  vendas_itens: (VendaItem & {
    produtos: Produto | null;
  })[];
  clientes?: {
    nome_emit: string | null;
    nome_abrev: string | null;
  } | null;
}

interface UseVendaDetalhesOptions {
  vendaId: string | null;
  enabled?: boolean;
}

export function useVendaDetalhes({ vendaId, enabled = true }: UseVendaDetalhesOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para carregar detalhes completos sob demanda
  const { data: venda, isLoading, error, refetch } = useQuery({
    queryKey: ["venda-detalhes", vendaId],
    queryFn: async () => {
      if (!vendaId) return null;

      const { data, error } = await supabase
        .from("vendas")
        .select(`
          *,
          clientes!vendas_cliente_id_fkey (
            nome_emit,
            nome_abrev
          ),
          vendas_itens (
            *,
            produtos (*)
          )
        `)
        .eq("id", vendaId)
        .single();

      if (error) throw error;

      // Ordenar itens por sequência
      if (data?.vendas_itens) {
        data.vendas_itens.sort((a: VendaItem, b: VendaItem) => 
          (a.sequencia_item || 0) - (b.sequencia_item || 0)
        );
      }

      return data as VendaComItens;
    },
    enabled: enabled && !!vendaId,
    staleTime: 1000 * 60 * 1, // 1 minuto
    gcTime: 1000 * 60 * 5,
  });

  // Criar nova venda
  const createVenda = useMutation({
    mutationFn: async (vendaData: VendaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .insert({
          ...vendaData,
          user_id: user.id,
          vendedor_id: vendaData.vendedor_id || user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: ["vendas-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-paginado"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Proposta criada!",
        description: `Proposta ${data.numero_venda} criada com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar proposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar venda
  const updateVenda = useMutation({
    mutationFn: async ({ id, ...vendaData }: Partial<Venda> & { id: string }) => {
      const { data, error } = await supabase
        .from("vendas")
        .update(vendaData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
      queryClient.invalidateQueries({ queryKey: ["vendas-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-paginado"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar proposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar venda
  const deleteVenda = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-paginado"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Proposta excluída!",
        description: "A proposta foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir proposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Adicionar item
  const addItem = useMutation({
    mutationFn: async (item: VendaItemInsert) => {
      const { data, error } = await supabase
        .from("vendas_itens")
        .insert(item)
        .select(`*, produtos (*)`)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remover item
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("vendas_itens")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...item }: Partial<VendaItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("vendas_itens")
        .update(item)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar sequência dos itens
  const updateItemsSequence = useMutation({
    mutationFn: async (items: Array<{ id: string; sequencia_item: number }>) => {
      const { error } = await supabase.rpc('atualizar_sequencia_itens_venda', {
        p_updates: items
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
      toast({
        title: "Ordem atualizada!",
        description: "Os itens foram reordenados com sucesso.",
      });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
      toast({
        title: "Erro ao reordenar itens",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Aprovar venda
  const aprovarVenda = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("vendas")
        .update({
          status: 'aprovada',
          aprovado_em: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venda-detalhes", vendaId] });
      queryClient.invalidateQueries({ queryKey: ["vendas-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-paginado"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Proposta aprovada!",
        description: "A proposta foi aprovada e agora conta nas metas da equipe.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar proposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    venda,
    isLoading,
    error,
    refetch,
    createVenda,
    updateVenda,
    deleteVenda,
    addItem,
    removeItem,
    updateItem,
    updateItemsSequence,
    aprovarVenda,
  };
}
