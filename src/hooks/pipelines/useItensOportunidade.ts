import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface ItemOportunidade {
  id: string;
  oportunidade_id: string | null;
  produto_id: string | null;
  nome_produto: string | null;
  quantidade: number;
  preco_unitario: number;
  percentual_desconto: number | null;
  preco_total: number | null;
  ordem_linha: number | null;
  criado_em: string | null;
}

export function useItensOportunidade(oportunidadeId: string | null) {
  return useQuery({
    queryKey: ["itens-oportunidade", oportunidadeId],
    queryFn: async () => {
      if (!oportunidadeId) return [];

      const { data, error } = await supabase
        .from("itens_linha_oportunidade")
        .select("*")
        .eq("oportunidade_id", oportunidadeId)
        .order("ordem_linha", { ascending: true });

      if (error) throw error;
      return data as ItemOportunidade[];
    },
    enabled: !!oportunidadeId,
  });
}

interface ItemParaInserir {
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  percentual_desconto: number;
}

export function useInserirItensOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oportunidadeId,
      itens,
    }: {
      oportunidadeId: string;
      itens: ItemParaInserir[];
    }) => {
      const { error } = await supabase.rpc("inserir_itens_oportunidade_bulk", {
        p_oportunidade_id: oportunidadeId,
        p_itens: itens as unknown as Json,
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itens-oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-oportunidades"] });
    },
    onError: (error: any) => {
      console.error("Erro ao inserir itens:", error);
      toast.error("Erro ao adicionar itens: " + error.message);
    },
  });
}

export function useRemoverItemOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      oportunidadeId,
    }: {
      itemId: string;
      oportunidadeId: string;
    }) => {
      const { error } = await supabase
        .from("itens_linha_oportunidade")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      // Recalcular valor total da oportunidade
      const { data: itens } = await supabase
        .from("itens_linha_oportunidade")
        .select("preco_total")
        .eq("oportunidade_id", oportunidadeId);

      const novoTotal = itens?.reduce((acc, item) => acc + (item.preco_total || 0), 0) || 0;

      await supabase
        .from("oportunidades")
        .update({ valor: novoTotal })
        .eq("id", oportunidadeId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itens-oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-oportunidades"] });
      toast.success("Item removido");
    },
    onError: (error: any) => {
      console.error("Erro ao remover item:", error);
      toast.error("Erro ao remover item: " + error.message);
    },
  });
}

interface DadosAtualizacaoItem {
  quantidade?: number;
  percentual_desconto?: number;
  preco_unitario?: number;
  preco_total?: number;
  produto_id?: string;
  nome_produto?: string;
}

export function useAtualizarItemOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      oportunidadeId,
      dados,
    }: {
      itemId: string;
      oportunidadeId: string;
      dados: DadosAtualizacaoItem;
    }) => {
      const { error } = await supabase
        .from("itens_linha_oportunidade")
        .update(dados)
        .eq("id", itemId);

      if (error) throw error;

      // Recalcular valor total da oportunidade
      const { data: itens } = await supabase
        .from("itens_linha_oportunidade")
        .select("preco_total")
        .eq("oportunidade_id", oportunidadeId);

      const novoTotal = itens?.reduce((acc, item) => acc + (item.preco_total || 0), 0) || 0;

      await supabase
        .from("oportunidades")
        .update({ valor: novoTotal })
        .eq("id", oportunidadeId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itens-oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-oportunidades"] });
      toast.success("Item atualizado");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar item:", error);
      toast.error("Erro ao atualizar item: " + error.message);
    },
  });
}
