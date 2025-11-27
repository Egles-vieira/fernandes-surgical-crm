import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

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
  // KPIs Gerais
  const { data: kpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
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
      } as DashboardKPIs;
    },
    refetchInterval: 60000,
  });

  // Vendas por mês (últimos 6 meses)
  const { data: vendasPorMes, isLoading: isLoadingVendasMes } = useQuery({
    queryKey: ["dashboard-vendas-mes"],
    queryFn: async () => {
      const meses: VendaPorMes[] = [];
      const hoje = new Date();

      for (let i = 5; i >= 0; i--) {
        const inicioMes = startOfMonth(subMonths(hoje, i));
        const fimMes = startOfMonth(subMonths(hoje, i - 1));

        const { data } = await supabase
          .from("vendas")
          .select("valor_total, valor_estimado")
          .gte("created_at", inicioMes.toISOString())
          .lt("created_at", fimMes.toISOString());

        const vendas = data || [];
        const valorTotal = vendas.reduce((acc, v) => acc + (v.valor_total || v.valor_estimado || 0), 0);

        meses.push({
          mes: format(inicioMes, "MMM"),
          valor: valorTotal,
          quantidade: vendas.length,
        });
      }

      return meses;
    },
    refetchInterval: 120000,
  });

  // Pipeline por etapa
  const { data: pipelinePorEtapa, isLoading: isLoadingPipeline } = useQuery({
    queryKey: ["dashboard-pipeline-etapa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendas")
        .select("etapa_pipeline, valor_total, valor_estimado");

      const etapas: Record<string, PipelinePorEtapa> = {
        lead: { etapa: "Leads", quantidade: 0, valor: 0 },
        contato: { etapa: "Contato", quantidade: 0, valor: 0 },
        proposta: { etapa: "Proposta", quantidade: 0, valor: 0 },
        negociacao: { etapa: "Negociação", quantidade: 0, valor: 0 },
        fechamento: { etapa: "Fechamento", quantidade: 0, valor: 0 },
      };

      (data || []).forEach((venda) => {
        const etapa = venda.etapa_pipeline || "lead";
        if (etapas[etapa]) {
          etapas[etapa].quantidade++;
          etapas[etapa].valor += venda.valor_total || venda.valor_estimado || 0;
        }
      });

      return Object.values(etapas);
    },
    refetchInterval: 60000,
  });

  // Top vendedores
  const { data: topVendedores, isLoading: isLoadingVendedores } = useQuery({
    queryKey: ["dashboard-top-vendedores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vw_performance_vendedor")
        .select("*")
        .order("percentual_atingimento", { ascending: false })
        .limit(5);

      return (data || []).map((v) => ({
        id: v.vendedor_id,
        nome: v.nome_vendedor || "Vendedor",
        meta: v.meta_valor || 0,
        realizado: v.realizado_valor || 0,
        percentual: v.percentual_atingimento || 0,
      })) as TopVendedor[];
    },
    refetchInterval: 120000,
  });

  return {
    kpis,
    vendasPorMes,
    pipelinePorEtapa,
    topVendedores,
    isLoading: isLoadingKpis || isLoadingVendasMes || isLoadingPipeline || isLoadingVendedores,
  };
}
