import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MetaEquipe {
  id: string;
  equipe_id: string;
  nome: string;
  descricao: string | null;
  tipo_meta: 'vendas' | 'atendimentos' | 'qualidade' | 'produtividade' | 'tickets_resolvidos' | 'tempo_resposta' | 'satisfacao_cliente' | 'conversao';
  metrica: string;
  valor_objetivo: number;
  valor_atual: number;
  unidade_medida: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  status: 'ativa' | 'concluida' | 'cancelada' | 'pausada';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  criado_em: string;
  atualizado_em: string;
}

export interface MetaComProgresso extends MetaEquipe {
  percentual_conclusao: number;
  meta_atingida: boolean;
  total_dias: number;
  dias_decorridos: number;
  dias_restantes: number;
  situacao_prazo: string;
  equipe_nome: string;
  alertas_nao_lidos: number;
}

export interface ProgressoMeta {
  id: string;
  meta_id: string;
  valor_anterior: number;
  valor_novo: number;
  diferenca: number;
  percentual_conclusao: number;
  origem: string;
  referencia_id: string | null;
  observacao: string | null;
  registrado_em: string;
}

export interface AlertaMeta {
  id: string;
  meta_id: string;
  tipo_alerta: 'prazo_proximo' | 'meta_em_risco' | 'meta_atingida' | 'meta_superada' | 'sem_progresso';
  severidade: 'info' | 'aviso' | 'critico';
  mensagem: string;
  lido: boolean;
  criado_em: string;
}

export function useMetasEquipe(equipeId?: string) {
  const queryClient = useQueryClient();

  // Buscar metas de uma equipe
  const { data: metas, isLoading } = useQuery({
    queryKey: ["metas-equipe", equipeId],
    queryFn: async () => {
      if (!equipeId) return [];

      const { data, error } = await supabase
        .from("vw_metas_com_progresso")
        .select("*")
        .eq("equipe_id", equipeId)
        .order("periodo_fim", { ascending: true });

      if (error) throw error;
      return data as MetaComProgresso[];
    },
    enabled: !!equipeId,
  });

  // Buscar progresso de uma meta
  const useProgressoMeta = (metaId: string | undefined) => {
    return useQuery({
      queryKey: ["progresso-meta", metaId],
      queryFn: async () => {
        if (!metaId) return [];

        const { data, error } = await supabase
          .from("progresso_metas")
          .select("*")
          .eq("meta_id", metaId)
          .order("registrado_em", { ascending: false })
          .limit(20);

        if (error) throw error;
        return data as ProgressoMeta[];
      },
      enabled: !!metaId,
    });
  };

  // Buscar alertas de uma meta
  const useAlertasMeta = (metaId: string | undefined) => {
    return useQuery({
      queryKey: ["alertas-meta", metaId],
      queryFn: async () => {
        if (!metaId) return [];

        const { data, error } = await supabase
          .from("alertas_metas")
          .select("*")
          .eq("meta_id", metaId)
          .eq("lido", false)
          .order("criado_em", { ascending: false });

        if (error) throw error;
        return data as AlertaMeta[];
      },
      enabled: !!metaId,
    });
  };

  // Criar meta
  const criarMeta = useMutation({
    mutationFn: async (novaMeta: Omit<MetaEquipe, 'id' | 'criado_em' | 'atualizado_em' | 'valor_atual'>) => {
      const { data, error } = await supabase
        .from("metas_equipe")
        .insert(novaMeta)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["metas-equipe", variables.equipe_id] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar meta:", error);
      toast.error(error.message || "Erro ao criar meta");
    },
  });

  // Atualizar meta
  const atualizarMeta = useMutation({
    mutationFn: async ({ metaId, dados }: { metaId: string; dados: Partial<MetaEquipe> }) => {
      const { error } = await supabase
        .from("metas_equipe")
        .update(dados)
        .eq("id", metaId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const meta = metas?.find(m => m.id === variables.metaId);
      if (meta) {
        queryClient.invalidateQueries({ queryKey: ["metas-equipe", meta.equipe_id] });
      }
      toast.success("Meta atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar meta:", error);
      toast.error(error.message || "Erro ao atualizar meta");
    },
  });

  // Cancelar meta
  const cancelarMeta = useMutation({
    mutationFn: async ({ metaId, motivo }: { metaId: string; motivo: string }) => {
      const { error } = await supabase
        .from("metas_equipe")
        .update({
          status: 'cancelada',
          cancelado_em: new Date().toISOString(),
          motivo_cancelamento: motivo,
        })
        .eq("id", metaId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const meta = metas?.find(m => m.id === variables.metaId);
      if (meta) {
        queryClient.invalidateQueries({ queryKey: ["metas-equipe", meta.equipe_id] });
      }
      toast.success("Meta cancelada");
    },
    onError: (error: any) => {
      console.error("Erro ao cancelar meta:", error);
      toast.error(error.message || "Erro ao cancelar meta");
    },
  });

  // Atualizar progresso manualmente
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
      const { data, error } = await supabase.rpc("atualizar_progresso_meta", {
        _meta_id: metaId,
        _novo_valor: novoValor,
        _origem: "manual",
        _observacao: observacao,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const meta = metas?.find(m => m.id === variables.metaId);
      if (meta) {
        queryClient.invalidateQueries({ queryKey: ["metas-equipe", meta.equipe_id] });
        queryClient.invalidateQueries({ queryKey: ["progresso-meta", variables.metaId] });
      }
      toast.success("Progresso atualizado!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar progresso:", error);
      toast.error(error.message || "Erro ao atualizar progresso");
    },
  });

  // Marcar alerta como lido
  const marcarAlertaLido = useMutation({
    mutationFn: async (alertaId: string) => {
      const { error } = await supabase
        .from("alertas_metas")
        .update({
          lido: true,
          lido_em: new Date().toISOString(),
        })
        .eq("id", alertaId);

      if (error) throw error;
    },
    onSuccess: (_, alertaId) => {
      queryClient.invalidateQueries({ queryKey: ["alertas-meta"] });
      queryClient.invalidateQueries({ queryKey: ["metas-equipe"] });
    },
    onError: (error: any) => {
      console.error("Erro ao marcar alerta como lido:", error);
    },
  });

  return {
    metas,
    isLoading,
    criarMeta,
    atualizarMeta,
    cancelarMeta,
    atualizarProgresso,
    marcarAlertaLido,
    useProgressoMeta,
    useAlertasMeta,
  };
}
