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

  // Remover membro da equipe
  const removerMembro = useMutation({
    mutationFn: async ({ equipeId, usuarioId }: { equipeId: string; usuarioId: string }) => {
      const { error } = await supabase
        .from("membros_equipe")
        .delete()
        .eq("equipe_id", equipeId)
        .eq("usuario_id", usuarioId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["membros-equipe", variables.equipeId] });
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

  return {
    equipes,
    isLoading,
    criarEquipe,
    atualizarEquipe,
    adicionarMembro,
    removerMembro,
    transferirLideranca,
    useMembrosEquipe,
  };
}
