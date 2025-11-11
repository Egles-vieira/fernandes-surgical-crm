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

export function useMetasVendedor(vendedorId?: string, filtros?: {
  status?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar metas do vendedor com filtros
  const { data: metas, isLoading } = useQuery({
    queryKey: ["metas-vendedor", vendedorId, filtros],
    queryFn: async () => {
      let query = supabase
        .from("metas_vendedor")
        .select("*")
        .order("periodo_inicio", { ascending: false });

      if (vendedorId) {
        query = query.eq("vendedor_id", vendedorId);
      }

      // Aplicar filtros
      if (filtros?.status) {
        query = query.eq("status", filtros.status);
      }

      if (filtros?.periodo_inicio) {
        query = query.gte("periodo_inicio", filtros.periodo_inicio);
      }

      if (filtros?.periodo_fim) {
        query = query.lte("periodo_fim", filtros.periodo_fim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!vendedorId,
  });

  // Calcular totalizadores
  const totalizadores = {
    totalMetaValor: metas?.reduce((acc, m) => acc + (m.meta_valor || 0), 0) || 0,
    totalRealizadoValor: metas?.reduce((acc, m) => acc + (m.valor_atual || 0), 0) || 0,
    totalMetaUnidades: metas?.reduce((acc, m) => acc + (m.meta_unidades || 0), 0) || 0,
    totalRealizadoUnidades: metas?.reduce((acc, m) => acc + (m.unidades_atual || 0), 0) || 0,
    metasAtivas: metas?.filter((m) => m.status === "ativa").length || 0,
    metasConcluidas: metas?.filter((m) => m.status === "concluida").length || 0,
  };

  // Criar nova meta
  const criarMeta = useMutation({
    mutationFn: async (meta: NovaMetaVendedorInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("metas_vendedor")
        .insert([{
          ...meta,
          criado_por: user?.id,
        }])
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

  // Editar meta existente
  const editarMeta = useMutation({
    mutationFn: async ({
      metaId,
      dados,
    }: {
      metaId: string;
      dados: {
        meta_valor: number;
        meta_unidades?: number | null;
        periodo_inicio: string;
        periodo_fim: string;
        observacao: string;
        valor_anterior: number;
        unidades_anterior?: number | null;
        periodo_fim_anterior: string;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Atualizar a meta
      const { error: updateError } = await supabase
        .from("metas_vendedor")
        .update({
          meta_valor: dados.meta_valor,
          meta_unidades: dados.meta_unidades,
          periodo_fim: dados.periodo_fim,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", metaId);

      if (updateError) throw updateError;

      // Registrar histórico de alteração
      const alteracoes: string[] = [];
      if (dados.meta_valor !== dados.valor_anterior) {
        alteracoes.push(
          `Valor: ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(dados.valor_anterior)} → ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(dados.meta_valor)}`
        );
      }
      if (dados.meta_unidades !== dados.unidades_anterior) {
        alteracoes.push(
          `Unidades: ${dados.unidades_anterior || 0} → ${dados.meta_unidades || 0}`
        );
      }
      if (dados.periodo_fim !== dados.periodo_fim_anterior) {
        alteracoes.push(
          `Prazo alterado para ${new Date(dados.periodo_fim).toLocaleDateString("pt-BR")}`
        );
      }

      const { error: historicoError } = await supabase
        .from("progresso_metas_vendedor")
        .insert({
          meta_id: metaId,
          valor_anterior: dados.valor_anterior,
          valor_novo: dados.meta_valor,
          observacao: `${dados.observacao}. Alterações: ${alteracoes.join("; ")}`,
        });

      if (historicoError) {
        console.error("Erro ao registrar histórico:", historicoError);
      }

      return { metaId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-vendedor"] });
      toast.success("Meta atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar meta", {
        description: error.message,
      });
    },
  });

  // Cancelar meta
  const cancelarMeta = useMutation({
    mutationFn: async ({ metaId, motivo }: { metaId: string; motivo?: string }) => {
      const { error } = await supabase
        .from("metas_vendedor")
        .update({ 
          status: "cancelada",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", metaId);

      if (error) throw error;

      // Registrar no histórico
      if (motivo) {
        await supabase
          .from("progresso_metas_vendedor")
          .insert({
            meta_id: metaId,
            valor_anterior: 0,
            valor_novo: 0,
            observacao: `Meta cancelada. Motivo: ${motivo}`,
          });
      }
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

  // Excluir meta
  const excluirMeta = useMutation({
    mutationFn: async ({ metaId }: { metaId: string }) => {
      const { error } = await supabase
        .from("metas_vendedor")
        .delete()
        .eq("id", metaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-vendedor"] });
      toast.success("Meta excluída com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir meta", {
        description: error.message,
      });
    },
  });

  return {
    metas,
    isLoading,
    totalizadores,
    criarMeta,
    editarMeta,
    atualizarProgresso,
    cancelarMeta,
    excluirMeta,
  };
}
