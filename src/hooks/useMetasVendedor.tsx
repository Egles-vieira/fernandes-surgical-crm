import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MetaVendedor {
  id: string;
  vendedor_id: string;
  equipe_id: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  meta_valor: number;
  meta_unidades: number | null;
  meta_margem: number | null;
  meta_conversao: number | null;
  valor_atual: number | null;
  unidades_atual: number | null;
  margem_atual: number | null;
  conversao_atual: number | null;
  status: string | null;
  criado_por: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

interface NovaMetaVendedorInput {
  vendedor_id: string;
  equipe_id?: string;
  periodo_inicio: string;
  periodo_fim: string;
  meta_valor: number;
  meta_unidades?: number;
  meta_margem?: number;
  meta_conversao?: number;
}

export function useMetasVendedor(vendedorId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar metas do vendedor
  const { data: metas, isLoading } = useQuery({
    queryKey: ["metas-vendedor", vendedorId],
    queryFn: async () => {
      let query = supabase
        .from("metas_vendedor")
        .select("*")
        .eq("status", "ativa")
        .order("periodo_inicio", { ascending: false });

      if (vendedorId) {
        query = query.eq("vendedor_id", vendedorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!vendedorId,
  });

  // Criar nova meta
  const criarMeta = useMutation({
    mutationFn: async (meta: NovaMetaVendedorInput) => {
      const { data, error } = await supabase
        .from("metas_vendedor")
        .insert([meta])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-vendedor"] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar meta", {
        description: error.message,
      });
    },
  });

  // Atualizar progresso da meta
  const atualizarProgresso = useMutation({
    mutationFn: async ({
      metaId,
      novoValor,
      observacao,
    }: {
      metaId: string;
      novoValor: number;
      observacao?: string;
    }) => {
      // Buscar meta atual
      const { data: metaAtual, error: fetchError } = await supabase
        .from("metas_vendedor")
        .select("valor_atual, meta_valor")
        .eq("id", metaId)
        .single();

      if (fetchError) throw fetchError;

      const valorAnterior = metaAtual.valor_atual || 0;
      const percentualConclusao = (novoValor / metaAtual.meta_valor) * 100;

      // Atualizar meta
      const { error: updateError } = await supabase
        .from("metas_vendedor")
        .update({ valor_atual: novoValor })
        .eq("id", metaId);

      if (updateError) throw updateError;

      return { percentualConclusao };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-vendedor"] });
      toast.success("Progresso atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar progresso", {
        description: error.message,
      });
    },
  });

  // Cancelar meta
  const cancelarMeta = useMutation({
    mutationFn: async ({ metaId }: { metaId: string }) => {
      const { error } = await supabase
        .from("metas_vendedor")
        .update({ status: "cancelada" })
        .eq("id", metaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-vendedor"] });
      toast.success("Meta cancelada");
    },
    onError: (error: any) => {
      toast.error("Erro ao cancelar meta", {
        description: error.message,
      });
    },
  });

  return {
    metas,
    isLoading,
    criarMeta,
    atualizarProgresso,
    cancelarMeta,
  };
}
