import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Venda = Tables<"vendas">;
type VendaItem = Tables<"vendas_itens">;
type VendaInsert = Omit<TablesInsert<"vendas">, "user_id">;
type VendaItemInsert = TablesInsert<"vendas_itens">;

interface VendaWithItems extends Venda {
  vendas_itens?: (VendaItem & {
    produtos?: Tables<"produtos">;
  })[];
  clientes?: {
    nome_emit: string | null;
    nome_abrev: string | null;
  };
}

export function useVendas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

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
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Garantir que os itens sempre estejam ordenados pela sequência
      const vendasComItensOrdenados = data?.map(venda => ({
        ...venda,
        vendas_itens: venda.vendas_itens?.sort((a, b) => 
          (a.sequencia_item || 0) - (b.sequencia_item || 0)
        )
      }));
      
      return vendasComItensOrdenados as VendaWithItems[];
    },
  });

  const createVenda = useMutation({
    mutationFn: async (venda: VendaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .insert({ 
          ...venda, 
          user_id: user.id,
          // Se vendedor_id não for fornecido, usa o usuário atual
          vendedor_id: venda.vendedor_id || user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVenda = useMutation({
    mutationFn: async ({ id, ...venda }: Partial<Venda> & { id: string }) => {
      const { data, error } = await supabase
        .from("vendas")
        .update(venda)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Venda atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVenda = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Venda excluída!",
        description: "A venda foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: VendaItemInsert) => {
      const { data, error } = await supabase
        .from("vendas_itens")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("vendas_itens")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItemsSequence = useMutation({
    mutationFn: async (items: Array<{ id: string; sequencia_item: number }>) => {
      const { error } = await supabase.rpc('atualizar_sequencia_itens_venda', {
        p_updates: items
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      // Invalidar e aguardar refetch para garantir ordem correta
      await queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Ordem atualizada!",
        description: "Os itens foram reordenados com sucesso.",
      });
    },
    onError: (error: any) => {
      // Recarregar dados em caso de erro para reverter mudança
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Erro ao reordenar itens",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({
        title: "Venda aprovada!",
        description: "A venda foi aprovada e agora conta nas metas da equipe.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    vendas,
    isLoading,
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