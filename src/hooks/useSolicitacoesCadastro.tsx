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
      console.log("=== DEBUG QUERY SOLICITAÇÕES ===");
      console.log("Status:", status);
      console.log("Page:", page);
      console.log("Search:", search);

      let query = supabase
        .from("solicitacoes_cadastro")
        .select("*", { count: "exact" })
        .is("excluido_em", null)
        .order("criado_em", { ascending: false });

      if (status && status !== "todos") {
        query = query.eq("status", status as StatusSolicitacao);
      }

      if (search) {
        query = query.or(
          `cnpj.ilike.%${search}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("❌ Erro na query:", error);
        throw new Error(`Falha ao buscar solicitações: ${error.message}`);
      }

      console.log("✅ Resultado:", data?.length, "solicitações");
      console.log("Total:", count);

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
      console.log("=== DEBUG CREATE SOLICITAÇÃO ===");
      console.log("Dados enviados:", data);

      const { data: result, error } = await supabase
        .from("solicitacoes_cadastro")
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao criar:", error);
        throw error;
      }

      console.log("✅ Solicitação criada:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("✅ Sucesso - ID:", data.id);
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      toast({ 
        title: "✅ Solicitação criada", 
        description: `ID: ${data.id.substring(0, 8)}...` 
      });
    },
    onError: (error: any) => {
      console.error("❌ Erro completo:", error);
      toast({ 
        title: "❌ Erro ao criar solicitação", 
        description: error.message || "Não foi possível criar a solicitação.",
        variant: "destructive" 
      });
    },
  });

  // Mutation para atualizar solicitação
  const updateSolicitacao = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SolicitacaoCadastroUpdate }) => {
      console.log("=== DEBUG UPDATE SOLICITAÇÃO ===");
      console.log("ID:", id);
      console.log("Dados:", data);

      const { data: result, error } = await supabase
        .from("solicitacoes_cadastro")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao atualizar:", error);
        throw error;
      }

      console.log("✅ Solicitação atualizada:", result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log("✅ Atualização bem-sucedida");
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-cadastro"] });
      queryClient.invalidateQueries({ queryKey: ["solicitacao-cadastro", variables.id] });
      toast({ 
        title: "✅ Alterações salvas", 
        description: "Solicitação atualizada com sucesso." 
      });
    },
    onError: (error: any) => {
      console.error("❌ Erro completo:", error);
      toast({ 
        title: "❌ Erro ao salvar", 
        description: error.message || "Não foi possível salvar as alterações.",
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
