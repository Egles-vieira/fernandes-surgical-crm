import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;
type ProdutoInsert = TablesInsert<"produtos">;

export function useProdutos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data as Produto[];
    },
  });

  const createProduto = useMutation({
    mutationFn: async (produto: ProdutoInsert) => {
      const { data, error } = await supabase
        .from("produtos")
        .insert(produto)
        .select()
        .single();

      if (error) throw error;

      // Create initial stock record
      if (data) {
        await supabase.from("estoque").insert({
          produto_id: data.id,
          tipo_movimentacao: "entrada",
          quantidade: data.quantidade_em_maos,
          quantidade_anterior: 0,
          quantidade_atual: data.quantidade_em_maos,
          documento: "CADASTRO_INICIAL",
          responsavel: "Sistema",
          observacao: "Estoque inicial do produto",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast({
        title: "Produto criado!",
        description: "O produto foi cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProduto = useMutation({
    mutationFn: async ({ id, ...produto }: Partial<Produto> & { id: string }) => {
      const { data, error } = await supabase
        .from("produtos")
        .update(produto)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast({
        title: "Produto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast({
        title: "Produto excluído!",
        description: "O produto foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    produtos,
    isLoading,
    createProduto,
    updateProduto,
    deleteProduto,
  };
}
