import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Contato = Tables<"contatos">;
type ContatoInsert = TablesInsert<"contatos">;
type ContatoUpdate = TablesUpdate<"contatos">;

export function useContatos(clienteId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createContato = useMutation({
    mutationFn: async (data: ContatoInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: novoContato, error } = await supabase
        .from("contatos")
        .insert([{
          ...data,
          proprietario_id: userData.user?.id,
          status_lead: data.status_lead || "qualificado",
          estagio_ciclo_vida: data.estagio_ciclo_vida || "cliente",
          esta_ativo: data.esta_ativo ?? true,
        }])
        .select()
        .single();

      if (error) throw error;
      return novoContato;
    },
    onSuccess: () => {
      if (clienteId) {
        queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      }
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast({
        title: "Contato criado!",
        description: "O contato foi adicionado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContato = useMutation({
    mutationFn: async ({ id, ...data }: ContatoUpdate & { id: string }) => {
      const { data: contatoAtualizado, error } = await supabase
        .from("contatos")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return contatoAtualizado;
    },
    onSuccess: () => {
      if (clienteId) {
        queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      }
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast({
        title: "Contato atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contatos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (clienteId) {
        queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      }
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast({
        title: "Contato excluído!",
        description: "O contato foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createContato,
    updateContato,
    deleteContato,
  };
}
