import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Info, TrendingUp, Target, DollarSign, Calendar } from "lucide-react";
import { formatCurrency, CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";
import { startOfMonth, subMonths, format } from "date-fns";

interface VendasPanelProps {
  isActive: boolean;
}

export function VendasPanel({ isActive }: VendasPanelProps) {
  // KPIs de Vendas com lazy loading
  const { data: vendasKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["vendas-panel-kpis"],
    queryFn: async () => {
      const [vendasRes, vendasMesRes] = await Promise.all([
        supabase.from("vendas").select("id, valor_total, valor_estimado, etapa_pipeline, created_at"),
        supabase.from("vendas").select("valor_total, valor_estimado, created_at")
          .gte("created_at", startOfMonth(new Date()).toISOString())
      ]);

      const vendas = vendasRes.data || [];
      const vendasMes = vendasMesRes.data || [];
      
      const totalVendas = vendas.length;
      const valorTotal = vendas.reduce((acc, v) => acc + (v.valor_total || v.valor_estimado || 0), 0);
      const valorMes = vendasMes.reduce((acc, v) => acc + (v.valor_total || v.valor_estimado || 0), 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      const vendasGanhas = vendas.filter(v => v.etapa_pipeline === "fechamento").length;
      const taxaConversao = totalVendas > 0 ? (vendasGanhas / totalVendas) * 100 : 0;

      return {
        totalVendas,
        valorTotal,
        valorMes,
        ticketMedio,
        taxaConversao: Math.round(taxaConversao)
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Vendas por etapa
  const { data: vendasPorEtapa, isLoading: isLoadingEtapa } = useQuery({
    queryKey: ["vendas-panel-etapa"],
    queryFn: async () => {
      const { data } = await supabase.from("vendas").select("etapa_pipeline, valor_total, valor_estimado");
      
      const etapas: Record<string, { etapa: string; quantidade: number; valor: number }> = {
        prospeccao: { etapa: "Prospecção", quantidade: 0, valor: 0 },
        qualificacao: { etapa: "Qualificação", quantidade: 0, valor: 0 },
        proposta: { etapa: "Proposta", quantidade: 0, valor: 0 },
        negociacao: { etapa: "Negociação", quantidade: 0, valor: 0 },
        followup_cliente: { etapa: "Follow-up", quantidade: 0, valor: 0 },
        fechamento: { etapa: "Fechamento", quantidade: 0, valor: 0 },
      };

      (data || []).forEach((venda) => {
        const etapa = venda.etapa_pipeline || "prospeccao";
        if (etapas[etapa]) {
          etapas[etapa].quantidade++;
          etapas[etapa].valor += venda.valor_total || venda.valor_estimado || 0;
        }
      });

      return Object.values(etapas);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Vendas por mês (últimos 6 meses)
  const { data: vendasPorMes, isLoading: isLoadingMes } = useQuery({
    queryKey: ["vendas-panel-mes"],
    queryFn: async () => {
      const meses: { mes: string; valor: number; quantidade: number }[] = [];
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
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = isLoadingKpis || isLoadingEtapa || isLoadingMes;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  const metaMensal = 500000;
  const progressoMeta = Math.min((vendasKpis?.valorMes || 0) / metaMensal * 100, 100);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernKPICard 
          title="Total de Vendas" 
          value={vendasKpis?.totalVendas || 0} 
          trend={12.5} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#10b981" 
        />
        <ModernKPICard 
          title="Valor Total" 
          value={formatCurrency(vendasKpis?.valorTotal || 0)} 
          trend={8.3} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#06b6d4" 
        />
        <ModernKPICard 
          title="Faturamento Mês" 
          value={formatCurrency(vendasKpis?.valorMes || 0)} 
          progress={progressoMeta} 
          progressGoal={`Meta: ${formatCurrency(metaMensal)}`} 
        />
        <ModernKPICard 
          title="Ticket Médio" 
          value={formatCurrency(vendasKpis?.ticketMedio || 0)} 
          trend={3.2} 
          subtitle="Valor médio por venda" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução de Vendas */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Evolução de Vendas (6 meses)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorMes || []}>
                  <defs>
                    <linearGradient id="colorVendasValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="valor" name="Valor" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorVendasValor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline por Etapa */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline por Etapa
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vendasPorEtapa || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="quantidade" nameKey="etapa">
                      {(vendasPorEtapa || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {(vendasPorEtapa || []).map((item, index) => (
                  <div key={item.etapa} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.etapa}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Vendas */}
      <Card className="bg-card border-border/30 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funil de Vendas
            </CardTitle>
            <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendasPorEtapa || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="etapa" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                  {(vendasPorEtapa || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
