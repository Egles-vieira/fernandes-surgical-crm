import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type EtapaPipeline = Tables<"vendas">["etapa_pipeline"];

// Tipo leve para o Kanban (sem itens, sem dados pesados)
export interface VendaPipelineCard {
  id: string;
  numero_venda: string;
  cliente_nome: string;
  cliente_cnpj: string | null;
  etapa_pipeline: EtapaPipeline;
  valor_estimado: number | null;
  valor_total: number;
  probabilidade: number | null;
  data_fechamento_prevista: string | null;
  status: string;
  created_at: string;
  responsavel_id: string | null;
  vendedor_id: string | null;
}

interface UseVendasPipelineOptions {
  diasAtras?: number; // Filtro por período (default: 90 dias)
  enabled?: boolean;
}

export function useVendasPipeline(options: UseVendasPipelineOptions = {}) {
  const { diasAtras = 90, enabled = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcula data limite para filtro
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasAtras);

  const { data: vendas = [], isLoading, error, refetch } = useQuery({
    queryKey: ["vendas-pipeline", diasAtras],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Query leve: apenas campos necessários para o Kanban
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          id,
          numero_venda,
          cliente_nome,
          cliente_cnpj,
          etapa_pipeline,
          valor_estimado,
          valor_total,
          probabilidade,
          data_fechamento_prevista,
          status,
          created_at,
          responsavel_id,
          vendedor_id
        `)
        .gte("created_at", dataLimite.toISOString())
        .not("etapa_pipeline", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as VendaPipelineCard[];
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos de cache
    gcTime: 1000 * 60 * 5, // 5 minutos no garbage collector
  });

  // Mutation otimista para mover cards no Kanban
  const moverEtapa = useMutation({
    mutationFn: async ({ id, etapa_pipeline }: { id: string; etapa_pipeline: EtapaPipeline }) => {
      const { data, error } = await supabase
        .from("vendas")
        .update({ etapa_pipeline })
        .eq("id", id)
        .select("id, etapa_pipeline")
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, etapa_pipeline }) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ["vendas-pipeline"] });

      // Snapshot do valor anterior
      const previousVendas = queryClient.getQueryData<VendaPipelineCard[]>(["vendas-pipeline", diasAtras]);

      // Atualização otimista
      queryClient.setQueryData<VendaPipelineCard[]>(["vendas-pipeline", diasAtras], (old) => {
        if (!old) return old;
        return old.map((venda) =>
          venda.id === id ? { ...venda, etapa_pipeline } : venda
        );
      });

      return { previousVendas };
    },
    onError: (error: any, _variables, context) => {
      // Rollback em caso de erro
      if (context?.previousVendas) {
        queryClient.setQueryData(["vendas-pipeline", diasAtras], context.previousVendas);
      }
      toast({
        title: "Erro ao mover proposta",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Revalidar após operação
      queryClient.invalidateQueries({ queryKey: ["vendas-pipeline"] });
    },
  });

  // Agrupar vendas por etapa para o Kanban
  const vendasPorEtapa = vendas.reduce((acc, venda) => {
    const etapa = venda.etapa_pipeline || "prospeccao";
    if (!acc[etapa]) acc[etapa] = [];
    acc[etapa].push(venda);
    return acc;
  }, {} as Record<string, VendaPipelineCard[]>);

  // Totais por etapa
  const totaisPorEtapa = Object.entries(vendasPorEtapa).reduce((acc, [etapa, vendasEtapa]) => {
    acc[etapa] = {
      quantidade: vendasEtapa.length,
      valorTotal: vendasEtapa.reduce((sum, v) => sum + (v.valor_estimado || v.valor_total || 0), 0),
      valorPotencial: vendasEtapa.reduce((sum, v) => {
        const valor = v.valor_estimado || v.valor_total || 0;
        const prob = v.probabilidade || 0;
        return sum + (valor * prob / 100);
      }, 0),
    };
    return acc;
  }, {} as Record<string, { quantidade: number; valorTotal: number; valorPotencial: number }>);

  // Total geral do pipeline
  const totalPipeline = vendas.reduce((sum, v) => {
    const valor = v.valor_estimado || v.valor_total || 0;
    const prob = v.probabilidade || 0;
    return sum + (valor * prob / 100);
  }, 0);

  return {
    vendas,
    vendasPorEtapa,
    totaisPorEtapa,
    totalPipeline,
    isLoading,
    error,
    refetch,
    moverEtapa,
  };
}
