import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { useState, useCallback } from "react";

type EtapaPipeline = Tables<"vendas">["etapa_pipeline"];

// Tipo leve para o Kanban (retorno da RPC get_vendas_pipeline_paginado)
export interface VendaPipelineCard {
  id: string;
  numero_venda: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  etapa_pipeline: string;
  valor_estimado: number | null;
  probabilidade: number | null;
  created_at: string;
  data_fechamento_prevista: string | null;
  vendedor_nome: string | null;
  total_itens: number;
  total_etapa: number;
  valor_total_etapa: number;
  valor_potencial_etapa: number;
}

interface UseVendasPipelineOptions {
  limitePorEtapaInicial?: number; // Máximo inicial de cards por etapa (default: 20)
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

const ETAPAS = [
  "prospeccao",
  "qualificacao", 
  "proposta",
  "negociacao",
  "followup_cliente",
  "fechamento",
  "ganho",
  "perdido"
] as const;

export function useVendasPipeline(options: UseVendasPipelineOptions = {}) {
  const { limitePorEtapaInicial = 20, diasAtras = 365, enabled = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estado para controlar limite por etapa (permite expandir individualmente)
  const [limitesPorEtapa, setLimitesPorEtapa] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    ETAPAS.forEach(etapa => {
      inicial[etapa] = limitePorEtapaInicial;
    });
    return inicial;
  });

  // Estado para rastrear qual etapa está carregando
  const [etapaCarregando, setEtapaCarregando] = useState<string | null>(null);

  const { data: vendas = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["vendas-pipeline", limitesPorEtapa, diasAtras],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Usar RPC otimizada que retorna TOP N por etapa com limites individuais
      const { data, error } = await supabase.rpc("get_vendas_pipeline_paginado", {
        p_limites_por_etapa: limitesPorEtapa,
        p_dias_atras: diasAtras,
      });

      if (error) throw error;
      
      // Limpar estado de loading da etapa após carregar
      setEtapaCarregando(null);
      
      return (data || []) as VendaPipelineCard[];
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos de cache
    gcTime: 1000 * 60 * 5, // 5 minutos no garbage collector
    placeholderData: keepPreviousData, // Mantém dados anteriores durante fetch
  });

  // Função para carregar mais itens de uma etapa específica
  const carregarMais = useCallback((etapa: string) => {
    setEtapaCarregando(etapa);
    setLimitesPorEtapa(prev => ({
      ...prev,
      [etapa]: (prev[etapa] || limitePorEtapaInicial) + 20
    }));
  }, [limitePorEtapaInicial]);

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
      const previousVendas = queryClient.getQueryData<VendaPipelineCard[]>(["vendas-pipeline", limitesPorEtapa, diasAtras]);

      // Atualização otimista
      queryClient.setQueryData<VendaPipelineCard[]>(["vendas-pipeline", limitesPorEtapa, diasAtras], (old) => {
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
        queryClient.setQueryData(["vendas-pipeline", limitesPorEtapa, diasAtras], context.previousVendas);
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

  // Agrupar vendas por etapa para o Kanban (RPC já retorna com limite correto por etapa)
  const vendasPorEtapa = vendas.reduce((acc, venda) => {
    const etapa = venda.etapa_pipeline || "prospeccao";
    if (!acc[etapa]) acc[etapa] = [];
    acc[etapa].push(venda);
    return acc;
  }, {} as Record<string, VendaPipelineCard[]>);

  // Totais por etapa (usando total_etapa do RPC para contagem real)
  const totaisPorEtapa = Object.entries(vendasPorEtapa).reduce((acc, [etapa, vendasEtapa]) => {
    // Pegar o total real da primeira venda da etapa (todas têm o mesmo total_etapa)
    const totalReal = vendasEtapa[0]?.total_etapa || vendasEtapa.length;
    
    acc[etapa] = {
      quantidade: vendasEtapa.length,
      quantidadeReal: Number(totalReal),
      valorTotal: vendasEtapa.reduce((sum, v) => sum + (v.valor_estimado || 0), 0),
      valorPotencial: vendasEtapa.reduce((sum, v) => {
        const valor = v.valor_estimado || 0;
        const prob = v.probabilidade || 0;
        return sum + (valor * prob / 100);
      }, 0),
    };
    return acc;
  }, {} as Record<string, TotaisEtapa>);

  // Total geral do pipeline (apenas do que está carregado)
  const totalPipeline = vendas.reduce((sum, v) => {
    const valor = v.valor_estimado || 0;
    const prob = v.probabilidade || 0;
    return sum + (valor * prob / 100);
  }, 0);

  return {
    vendas,
    vendasPorEtapa,
    totaisPorEtapa,
    totalPipeline,
    isLoading,
    isFetching,
    etapaCarregando,
    error,
    refetch,
    moverEtapa,
    carregarMais,
    limitesPorEtapa,
  };
}
