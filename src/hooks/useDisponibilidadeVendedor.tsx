import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DisponibilidadeConfig {
  esta_disponivel: boolean;
  horario_trabalho_inicio: string;
  horario_trabalho_fim: string;
  max_conversas_simultaneas: number;
}

export function useDisponibilidadeVendedor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["disponibilidade-vendedor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("esta_disponivel, horario_trabalho_inicio, horario_trabalho_fim, max_conversas_simultaneas")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as DisponibilidadeConfig;
    },
  });

  const atualizarDisponibilidade = useMutation({
    mutationFn: async (novaConfig: Partial<DisponibilidadeConfig>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("perfis_usuario")
        .update(novaConfig)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disponibilidade-vendedor"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-disponiveis"] });
      toast({
        title: "Disponibilidade atualizada",
        description: "Suas configurações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleDisponibilidade = () => {
    if (config) {
      atualizarDisponibilidade.mutate({ esta_disponivel: !config.esta_disponivel });
    }
  };

  return {
    config,
    isLoading,
    atualizarDisponibilidade: atualizarDisponibilidade.mutate,
    isAtualizando: atualizarDisponibilidade.isPending,
    toggleDisponibilidade,
  };
}
