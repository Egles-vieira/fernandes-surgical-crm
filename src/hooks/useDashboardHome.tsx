import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardKPIs {
  totalClientes: number;
  totalProdutos: number;
  totalVendas: number;
  valorPipelineAtivo: number;
  ticketsAbertos: number;
  taxaConversao: number;
}

export interface VendaPorMes {
  mes: string;
  valor: number;
  quantidade: number;
}

export interface PipelinePorEtapa {
  etapa: string;
  quantidade: number;
  valor: number;
}

export interface TopVendedor {
  id: string;
  nome: string;
  meta: number;
  realizado: number;
  percentual: number;
}

export function useDashboardHome() {
  // KPIs Gerais - Agora usando View Materializada (refresh a cada 5 min via pg_cron)
  const { data: kpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["dashboard-kpis-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_dashboard_kpis")
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao buscar KPIs da MV:", error);
        // Fallback para query direta se MV não existir
        return fetchKpisFallback();
      }

      return {
        totalClientes: data.total_clientes || 0,
        totalProdutos: data.total_produtos || 0,
        totalVendas: data.total_vendas || 0,
        valorPipelineAtivo: data.valor_pipeline_ativo || 0,
        ticketsAbertos: data.tickets_abertos || 0,
        taxaConversao: data.taxa_conversao || 0,
      } as DashboardKPIs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - alinhado com refresh do pg_cron
    refetchInterval: 5 * 60 * 1000,
  });

  // Vendas por mês - Usando View Materializada
  const { data: vendasPorMes, isLoading: isLoadingVendasMes } = useQuery({
    queryKey: ["dashboard-vendas-mes-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_vendas_por_mes")
        .select("*")
        .order("ordem_mes", { ascending: true });

      if (error) {
        console.error("Erro ao buscar vendas por mês da MV:", error);
        return [];
      }

      return (data || []).map((item) => ({
        mes: item.mes_abrev,
        valor: Number(item.valor_total) || 0,
        quantidade: Number(item.quantidade) || 0,
      })) as VendaPorMes[];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Pipeline por etapa - Usando View Materializada
  const { data: pipelinePorEtapa, isLoading: isLoadingPipeline } = useQuery({
    queryKey: ["dashboard-pipeline-etapa-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_pipeline_por_etapa")
        .select("*");

      if (error) {
        console.error("Erro ao buscar pipeline da MV:", error);
        return [];
      }

      return (data || []).map((item) => ({
        etapa: item.etapa_label,
        quantidade: Number(item.quantidade) || 0,
        valor: Number(item.valor_total) || 0,
      })) as PipelinePorEtapa[];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Top vendedores - Usando View Materializada
  const { data: topVendedores, isLoading: isLoadingVendedores } = useQuery({
    queryKey: ["dashboard-top-vendedores-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_top_vendedores")
        .select("*")
        .order("realizado", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Erro ao buscar top vendedores da MV:", error);
        // Fallback para view existente
        const { data: fallbackData } = await supabase
          .from("vw_performance_vendedor")
          .select("*")
          .order("percentual_atingimento", { ascending: false })
          .limit(5);

        return (fallbackData || []).map((v) => ({
          id: v.vendedor_id,
          nome: v.nome_vendedor || "Vendedor",
          meta: v.meta_valor || 0,
          realizado: v.realizado_valor || 0,
          percentual: v.percentual_atingimento || 0,
        })) as TopVendedor[];
      }

      return (data || []).map((v) => ({
        id: v.vendedor_id,
        nome: v.nome || "Vendedor",
        meta: Number(v.meta) || 0,
        realizado: Number(v.realizado) || 0,
        percentual: Number(v.percentual) || 0,
      })) as TopVendedor[];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    kpis,
    vendasPorMes,
    pipelinePorEtapa,
    topVendedores,
    isLoading: isLoadingKpis || isLoadingVendasMes || isLoadingPipeline || isLoadingVendedores,
  };
}

// Função de fallback caso as MVs não existam (para retrocompatibilidade)
async function fetchKpisFallback(): Promise<DashboardKPIs> {
  const [clientesRes, produtosRes, vendasRes, ticketsRes] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("produtos").select("id", { count: "exact", head: true }),
    supabase.from("vendas").select("id, valor_total, valor_estimado, etapa_pipeline"),
    supabase.from("tickets").select("id, status", { count: "exact" }).eq("status", "aberto"),
  ]);

  const vendas = vendasRes.data || [];
  const vendasGanhas = vendas.filter(v => v.etapa_pipeline === "fechamento");
  const pipelineAtivo = vendas.filter(v => !["fechamento", "perdido"].includes(v.etapa_pipeline || ""));
  
  const valorPipeline = pipelineAtivo.reduce((acc, v) => acc + (v.valor_estimado || v.valor_total || 0), 0);
  const taxaConversao = vendas.length > 0 ? (vendasGanhas.length / vendas.length) * 100 : 0;

  return {
    totalClientes: clientesRes.count || 0,
    totalProdutos: produtosRes.count || 0,
    totalVendas: vendas.length,
    valorPipelineAtivo: valorPipeline,
    ticketsAbertos: ticketsRes.count || 0,
    taxaConversao: Math.round(taxaConversao),
  };
}
