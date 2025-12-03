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
  row_num?: number;
  total_na_etapa?: number;
}

interface UseVendasPipelineOptions {
  limitePorEtapa?: number; // Máximo de cards por etapa (default: 20)
  diasAtras?: number; // Filtro por período (default: 90 dias)
  enabled?: boolean;
}

// Tipo para totais por etapa incluindo contagem real
interface TotaisEtapa {
  quantidade: number;
  quantidadeReal: number; // Total real no banco (não apenas carregados)
  valorTotal: number;
  valorPotencial: number;
}

export function useVendasPipeline(options: UseVendasPipelineOptions = {}) {
  const { limitePorEtapa = 20, diasAtras = 90, enabled = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendas = [], isLoading, error, refetch } = useQuery({
    queryKey: ["vendas-pipeline", limitePorEtapa, diasAtras],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Usar RPC otimizada que retorna TOP N por etapa
      const { data, error } = await supabase.rpc("get_vendas_pipeline_paginado", {
        p_limite_por_etapa: limitePorEtapa,
        p_dias_atras: diasAtras,
      });

      if (error) throw error;
      return (data || []) as VendaPipelineCard[];
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
      const previousVendas = queryClient.getQueryData<VendaPipelineCard[]>(["vendas-pipeline", limitePorEtapa, diasAtras]);

      // Atualização otimista
      queryClient.setQueryData<VendaPipelineCard[]>(["vendas-pipeline", limitePorEtapa, diasAtras], (old) => {
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
        queryClient.setQueryData(["vendas-pipeline", limitePorEtapa, diasAtras], context.previousVendas);
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

  // Totais por etapa (usando total_na_etapa do RPC para contagem real)
  const totaisPorEtapa = Object.entries(vendasPorEtapa).reduce((acc, [etapa, vendasEtapa]) => {
    // Pegar o total real da primeira venda da etapa (todas têm o mesmo total_na_etapa)
    const totalReal = vendasEtapa[0]?.total_na_etapa || vendasEtapa.length;
    
    acc[etapa] = {
      quantidade: vendasEtapa.length,
      quantidadeReal: Number(totalReal),
      valorTotal: vendasEtapa.reduce((sum, v) => sum + (v.valor_estimado || v.valor_total || 0), 0),
      valorPotencial: vendasEtapa.reduce((sum, v) => {
        const valor = v.valor_estimado || v.valor_total || 0;
        const prob = v.probabilidade || 0;
        return sum + (valor * prob / 100);
      }, 0),
    };
    return acc;
  }, {} as Record<string, TotaisEtapa>);

  // Total geral do pipeline (apenas do que está carregado)
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
    limitePorEtapa,
  };
}
