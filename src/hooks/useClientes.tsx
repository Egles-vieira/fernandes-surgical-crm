import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes">;
type ClienteInsert = Omit<TablesInsert<"clientes">, "user_id">;

interface UseClientesParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

export function useClientes({ page = 1, pageSize = 50, searchTerm = "" }: UseClientesParams = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["clientes", page, pageSize, searchTerm],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .order("nome_emit");

      // Aplicar filtro de busca se houver
      if (searchTerm) {
        query = query.or(`nome_abrev.ilike.%${searchTerm}%,cgc.ilike.%${searchTerm}%,nome_emit.ilike.%${searchTerm}%`);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { clientes: data as Cliente[], total: count || 0 };
    },
  });

  const clientes = data?.clientes || [];
  const total = data?.total || 0;

  const createCliente = useMutation({
    mutationFn: async (cliente: ClienteInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...cliente, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente criado!",
        description: "O cliente foi cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCliente = useMutation({
    mutationFn: async ({ id, ...cliente }: Partial<Cliente> & { id: string }) => {
      const { data, error } = await supabase
        .from("clientes")
        .update(cliente)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente excluído!",
        description: "O cliente foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    clientes,
    total,
    isLoading,
    createCliente,
    updateCliente,
    deleteCliente,
  };
}