import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SolicitacaoCadastro = Database["public"]["Tables"]["solicitacoes_cadastro"]["Row"];
type SolicitacaoCadastroInsert = Database["public"]["Tables"]["solicitacoes_cadastro"]["Insert"];
type SolicitacaoCadastroUpdate = Database["public"]["Tables"]["solicitacoes_cadastro"]["Update"];

export type StatusSolicitacao = "rascunho" | "em_analise" | "aprovado" | "rejeitado";

interface UseSolicitacoesParams {
  status?: StatusSolicitacao | "todos";
  page?: number;
  pageSize?: number;
  search?: string;
}

export const useSolicitacoesCadastro = (params?: UseSolicitacoesParams) => {
  const queryClient = useQueryClient();
  const { status, page = 1, pageSize = 20, search } = params || {};

  // Query para listar solicitações
  const { data, isLoading, error } = useQuery({
    queryKey: ["solicitacoes-cadastro", status, page, search],
    queryFn: async () => {
      let query = supabase
        .from("solicitacoes_cadastro")
        .select("*, criado_por(email)", { count: "exact" })
        .is("excluido_em", null)
        .order("criado_em", { ascending: false });

      if (status && status !== "todos") {
        query = query.eq("status", status as StatusSolicitacao);
      }

      if (search) {
        query = query.or(`cnpj.ilike.%${search}%,dados_coletados->>razao_social.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        solicitacoes: data as SolicitacaoCadastro[],
        total: count || 0,
      };
    },
  });

  // Query para obter uma solicitação específica
  const useSolicitacao = (id?: string) => {
    return useQuery({
      queryKey: ["solicitacao-cadastro", id],
      queryFn: async () => {
        if (!id) return null;
        const { data, error } = await supabase
          .from("solicitacoes_cadastro")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as SolicitacaoCadastro;
      },
      enabled: !!id,
    });
  };

  // Mutation para criar solicitação
  const createSolicitacao = useMutation({
    mutationFn: async (data: SolicitacaoCadastroInsert) => {
      const { data: result, error } = await supabase
        .from("solicitacoes_cadastro")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      toast({ title: "Solicitação criada", description: "A solicitação foi criada com sucesso." });
    },
    onError: (error) => {
      console.error("Erro ao criar solicitação:", error);
      toast({ 
        title: "Erro ao criar solicitação", 
        description: "Não foi possível criar a solicitação. Tente novamente.",
        variant: "destructive" 
      });
    },
  });

  // Mutation para atualizar solicitação
  const updateSolicitacao = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SolicitacaoCadastroUpdate }) => {
      const { data: result, error } = await supabase
        .from("solicitacoes_cadastro")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      queryClient.invalidateQueries({ queryKey: ["solicitacao-cadastro", variables.id] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar solicitação:", error);
      toast({ 
        title: "Erro ao salvar", 
        description: "Não foi possível salvar as alterações.",
        variant: "destructive" 
      });
    },
  });

  // Mutation para aprovar solicitação
  const aprovarSolicitacao = useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from("solicitacoes_cadastro")
        .update({
          status: "aprovado",
          aprovado_por: user.user?.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      toast({ title: "Solicitação aprovada", description: "Cliente criado com sucesso." });
    },
    onError: (error) => {
      console.error("Erro ao aprovar:", error);
      toast({ 
        title: "Erro ao aprovar", 
        description: "Não foi possível aprovar a solicitação.",
        variant: "destructive" 
      });
    },
  });

  // Mutation para rejeitar solicitação
  const rejeitarSolicitacao = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data: result, error } = await supabase
        .from("solicitacoes_cadastro")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      toast({ title: "Solicitação rejeitada", description: "A solicitação foi rejeitada." });
    },
    onError: (error) => {
      console.error("Erro ao rejeitar:", error);
      toast({ 
        title: "Erro ao rejeitar", 
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive" 
      });
    },
  });

  // Mutation para deletar (soft delete)
  const deleteSolicitacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("solicitacoes_cadastro")
        .update({ excluido_em: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      toast({ title: "Solicitação excluída", description: "A solicitação foi excluída com sucesso." });
    },
    onError: (error) => {
      console.error("Erro ao excluir:", error);
      toast({ 
        title: "Erro ao excluir", 
        description: "Não foi possível excluir a solicitação.",
        variant: "destructive" 
      });
    },
  });

  return {
    solicitacoes: data?.solicitacoes || [],
    total: data?.total || 0,
    isLoading,
    error,
    useSolicitacao,
    createSolicitacao,
    updateSolicitacao,
    aprovarSolicitacao,
    rejeitarSolicitacao,
    deleteSolicitacao,
  };
};
