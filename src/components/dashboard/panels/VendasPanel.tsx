import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Info, TrendingUp, Target } from "lucide-react";
import { formatCurrency, CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";

interface VendasPanelProps {
  isActive: boolean;
}

export function VendasPanel({ isActive }: VendasPanelProps) {
  // KPIs de Vendas - usando Materialized View
  const { data: vendasKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["vendas-panel-kpis-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_vendas_resumo")
        .select("*")
        .single();

      if (error) throw error;
      
      return {
        totalVendas: data?.total_vendas || 0,
        valorTotal: data?.valor_total || 0,
        valorMes: data?.valor_mes || 0,
        ticketMedio: data?.ticket_medio || 0,
        taxaConversao: data?.taxa_conversao || 0
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Vendas por etapa - usando Materialized View
  const { data: vendasPorEtapa, isLoading: isLoadingEtapa } = useQuery({
    queryKey: ["vendas-panel-etapa-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_vendas_por_etapa")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Vendas por mês - usando Materialized View existente
  const { data: vendasPorMes, isLoading: isLoadingMes } = useQuery({
    queryKey: ["vendas-panel-mes-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_vendas_por_mes")
        .select("*")
        .order("ordem_mes", { ascending: true });

      if (error) throw error;
      return data || [];
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
                {(vendasPorEtapa || []).map((item: any, index: number) => (
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