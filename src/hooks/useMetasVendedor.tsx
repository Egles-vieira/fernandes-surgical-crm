import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MetaVendedor {
  id: string;
  vendedor_id: string;
  equipe_id: string | null;
  nome: string;
  descricao: string | null;
  tipo_meta: 'vendas' | 'atendimentos' | 'conversao' | 'satisfacao_cliente';
  metrica: string;
  unidade_medida: string | null;
  valor_objetivo: number;
  valor_atual: number;
  periodo_inicio: string;
  periodo_fim: string;
  alerta_percentual: number;
  status: 'ativa' | 'concluida' | 'cancelada' | 'pausada';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  concluido_em: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
}

interface NovaMetaVendedorInput {
  vendedor_id: string;
  equipe_id?: string;
  nome: string;
  descricao?: string;
  tipo_meta: string;
  metrica: string;
  unidade_medida?: string;
  valor_objetivo: number;
  periodo_inicio: string;
  periodo_fim: string;
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica';
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
        .order("periodo_inicio", { ascending: false });

      if (vendedorId) {
        query = query.eq("vendedor_id", vendedorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MetaVendedor[];
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
        .select("valor_atual, valor_objetivo")
        .eq("id", metaId)
        .single();

      if (fetchError) throw fetchError;

      const valorAnterior = metaAtual.valor_atual || 0;
      const percentualConclusao = (novoValor / metaAtual.valor_objetivo) * 100;

      // Atualizar meta
      const { error: updateError } = await supabase
        .from("metas_vendedor")
        .update({ valor_atual: novoValor })
        .eq("id", metaId);

      if (updateError) throw updateError;

      // Registrar progresso
      const { error: progressoError } = await supabase
        .from("progresso_metas_vendedor")
        .insert([
          {
            meta_id: metaId,
            valor_anterior: valorAnterior,
            valor_novo: novoValor,
            percentual_conclusao: percentualConclusao,
            observacao,
            origem: "manual",
          },
        ]);

      if (progressoError) throw progressoError;

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
    mutationFn: async ({
      metaId,
      motivo,
    }: {
      metaId: string;
      motivo: string;
    }) => {
      const { error } = await supabase
        .from("metas_vendedor")
        .update({
          status: "cancelada",
          cancelado_em: new Date().toISOString(),
          motivo_cancelamento: motivo,
        })
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
