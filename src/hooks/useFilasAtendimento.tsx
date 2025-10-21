import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type FilaAtendimento = Tables<"filas_atendimento">;
type FilaAtendimentoInsert = TablesInsert<"filas_atendimento">;
type FilaAtendimentoUpdate = TablesUpdate<"filas_atendimento">;

export function useFilasAtendimento() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ["filas_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("esta_ativa", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as FilaAtendimento[];
    },
  });

  const createFila = useMutation({
    mutationFn: async (fila: FilaAtendimentoInsert) => {
      const { data, error } = await supabase
        .from("filas_atendimento")
        .insert([fila])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filas_atendimento"] });
      toast({
        title: "Fila criada!",
        description: "A fila de atendimento foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFila = useMutation({
    mutationFn: async ({ id, ...fila }: FilaAtendimentoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("filas_atendimento")
        .update(fila)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filas_atendimento"] });
      toast({
        title: "Fila atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFila = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("filas_atendimento")
        .update({ esta_ativa: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filas_atendimento"] });
      toast({
        title: "Fila desativada!",
        description: "A fila foi desativada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desativar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    filas,
    isLoading,
    createFila,
    updateFila,
    deleteFila,
  };
}
