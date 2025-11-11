import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Equipe {
  id: string;
  nome: string;
  descricao: string | null;
  lider_equipe_id: string | null;
  tipo_equipe: string | null;
  esta_ativa: boolean;
  criado_em: string;
  atualizado_em: string;
  excluido_em: string | null;
}

export interface MembroEquipe {
  equipe_id: string;
  usuario_id: string;
  entrou_em: string;
}

export function useEquipes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as equipes ativas
  const { data: equipes, isLoading } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .eq("esta_ativa", true)
        .is("excluido_em", null)
        .order("nome");

      if (error) throw error;
      return data as Equipe[];
    },
  });

  // Buscar membros de uma equipe
  const useMembrosEquipe = (equipeId: string | undefined) => {
    return useQuery({
      queryKey: ["membros-equipe", equipeId],
      queryFn: async () => {
        if (!equipeId) return [];
        
        const { data, error } = await supabase
          .from("membros_equipe")
          .select("equipe_id, usuario_id, entrou_em")
          .eq("equipe_id", equipeId);

        if (error) throw error;
        return data;
      },
      enabled: !!equipeId,
    });
  };

  // Criar equipe
  const criarEquipe = useMutation({
    mutationFn: async (equipe: Omit<Equipe, 'id' | 'criado_em' | 'atualizado_em' | 'excluido_em'>) => {
      const { data, error } = await supabase
        .from("equipes")
        .insert(equipe)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast({
        title: "Equipe criada",
        description: "A equipe foi criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar equipe",
        description: error.message,
      });
    },
  });

  // Atualizar equipe
  const atualizarEquipe = useMutation({
    mutationFn: async ({ id, ...equipe }: Partial<Equipe> & { id: string }) => {
      const { data, error } = await supabase
        .from("equipes")
        .update(equipe)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast({
        title: "Equipe atualizada",
        description: "As alterações foram salvas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar equipe",
        description: error.message,
      });
    },
  });

  // Adicionar membro à equipe
  const adicionarMembro = useMutation({
    mutationFn: async ({ equipeId, usuarioId }: { equipeId: string; usuarioId: string }) => {
      const { data, error } = await supabase
        .from("membros_equipe")
        .insert({
          equipe_id: equipeId,
          usuario_id: usuarioId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["membros-equipe", variables.equipeId] });
      toast({
        title: "Membro adicionado",
        description: "O usuário foi adicionado à equipe",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar membro",
        description: error.message,
      });
    },
  });

  // Remover membro da equipe (soft delete com motivo)
  const removerMembro = useMutation({
    mutationFn: async ({ 
      equipeId, 
      usuarioId,
      motivo
    }: { 
      equipeId: string; 
      usuarioId: string;
      motivo: string;
    }) => {
      const { error } = await supabase
        .from("membros_equipe")
        .update({
          saiu_em: new Date().toISOString(),
          esta_ativo: false,
          motivo_saida: motivo,
        })
        .eq("equipe_id", equipeId)
        .eq("usuario_id", usuarioId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["membros-equipe", variables.equipeId] });
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast({
        title: "Membro removido",
        description: "O usuário foi removido da equipe",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover membro",
        description: error.message,
      });
    },
  });

  // Transferir liderança da equipe
  const transferirLideranca = useMutation({
    mutationFn: async ({ 
      equipeId, 
      novoLiderId, 
      motivo 
    }: { 
      equipeId: string; 
      novoLiderId: string; 
      motivo?: string;
    }) => {
      const { data, error } = await supabase.rpc("transferir_lideranca_equipe", {
        _equipe_id: equipeId,
        _novo_lider_id: novoLiderId,
        _motivo: motivo || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      queryClient.invalidateQueries({ queryKey: ["membros-equipe"] });
      toast({
        title: "Liderança transferida",
        description: "A liderança da equipe foi transferida com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao transferir liderança",
        description: error.message,
      });
    },
  });

  // Editar membro da equipe
  const editarMembro = useMutation({
    mutationFn: async ({
      equipeId,
      usuarioId,
      dados,
    }: {
      equipeId: string;
      usuarioId: string;
      dados: {
        papel?: string;
        carga_trabalho?: number;
        nivel_acesso?: string;
        observacoes?: string;
      };
    }) => {
      const { error } = await supabase
        .from("membros_equipe")
        .update(dados)
        .eq("equipe_id", equipeId)
        .eq("usuario_id", usuarioId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["membros-equipe", variables.equipeId] });
      toast({
        title: "Membro atualizado",
        description: "As informações do membro foram atualizadas",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao editar membro",
        description: error.message,
      });
    },
  });

  // Transferir membro entre equipes
  const transferirMembro = useMutation({
    mutationFn: async ({
      usuarioId,
      equipeOrigemId,
      equipeDestinoId,
      manterPapel,
      novoPapel,
      motivo,
    }: {
      usuarioId: string;
      equipeOrigemId: string;
      equipeDestinoId: string;
      manterPapel: boolean;
      novoPapel?: string;
      motivo: string;
    }) => {
      const { data, error } = await supabase.rpc("transferir_membro_equipe", {
        _usuario_id: usuarioId,
        _equipe_origem_id: equipeOrigemId,
        _equipe_destino_id: equipeDestinoId,
        _manter_papel: manterPapel,
        _novo_papel: novoPapel,
        _motivo: motivo,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["membros-equipe", variables.equipeOrigemId] });
      queryClient.invalidateQueries({ queryKey: ["membros-equipe", variables.equipeDestinoId] });
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast({
        title: "Membro transferido",
        description: "O membro foi transferido entre equipes com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao transferir membro",
        description: error.message,
      });
    },
  });

  // Mutation para editar equipe
  const editarEquipe = useMutation({
    mutationFn: async ({ equipeId, dados }: { equipeId: string; dados: Partial<Equipe> }) => {
      const { error } = await supabase
        .from("equipes")
        .update({
          ...dados,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", equipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao editar equipe:", error);
      toast.error(error.message || "Erro ao atualizar equipe");
    },
  });

  // Mutation para desativar equipe
  const desativarEquipe = useMutation({
    mutationFn: async ({ equipeId, motivo }: { equipeId: string; motivo?: string }) => {
      const { error } = await supabase
        .from("equipes")
        .update({
          esta_ativa: false,
          excluido_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", equipeId);

      if (error) throw error;

      // Registrar no histórico manualmente
      if (motivo) {
        await supabase.from("historico_atividades_equipe").insert({
          equipe_id: equipeId,
          tipo_atividade: "desativacao",
          descricao: `Equipe desativada: ${motivo}`,
          dados_novos: { motivo },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe desativada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao desativar equipe:", error);
      toast.error(error.message || "Erro ao desativar equipe");
    },
  });

  // Mutation para reativar equipe
  const reativarEquipe = useMutation({
    mutationFn: async (equipeId: string) => {
      const { error } = await supabase
        .from("equipes")
        .update({
          esta_ativa: true,
          excluido_em: null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", equipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe reativada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao reativar equipe:", error);
      toast.error(error.message || "Erro ao reativar equipe");
    },
  });

  // Mutation para excluir equipe permanentemente
  const excluirEquipe = useMutation({
    mutationFn: async (equipeId: string) => {
      const { error } = await supabase
        .from("equipes")
        .delete()
        .eq("id", equipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe excluída permanentemente!");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir equipe:", error);
      toast.error(error.message || "Erro ao excluir equipe");
    },
  });

  return {
    equipes,
    isLoading,
    criarEquipe,
    atualizarEquipe,
    editarEquipe,
    desativarEquipe,
    reativarEquipe,
    excluirEquipe,
    adicionarMembro,
    removerMembro,
    editarMembro,
    transferirMembro,
    transferirLideranca,
    useMembrosEquipe,
  };
}
