import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Headphones, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";

interface ServicesPanelProps {
  isActive: boolean;
}

export function ServicesPanel({ isActive }: ServicesPanelProps) {
  // KPIs de Tickets/Services - usando Materialized View
  const { data: servicesKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["services-panel-kpis-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_tickets_resumo")
        .select("*")
        .single();

      if (error) throw error;
      
      return {
        totalTickets: data?.total_tickets || 0,
        ticketsAbertos: data?.tickets_abertos || 0,
        ticketsEmAndamento: data?.tickets_em_andamento || 0,
        ticketsResolvidos: data?.tickets_resolvidos || 0,
        ticketsUrgentes: data?.tickets_urgentes || 0,
        taxaResolucao: data?.taxa_resolucao || 0
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Tickets por status - usando Materialized View
  const { data: ticketsPorStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["services-panel-status-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_tickets_por_status")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Tickets por prioridade - usando Materialized View
  const { data: ticketsPorPrioridade, isLoading: isLoadingPrioridade } = useQuery({
    queryKey: ["services-panel-prioridade-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_tickets_por_prioridade")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = isLoadingKpis || isLoadingStatus || isLoadingPrioridade;

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

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernKPICard 
          title="Total Tickets" 
          value={servicesKpis?.totalTickets || 0} 
          trend={8.3} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#0ea5e9" 
        />
        <ModernKPICard 
          title="Tickets Abertos" 
          value={servicesKpis?.ticketsAbertos || 0} 
          trend={-12.5} 
          subtitle="Aguardando atendimento" 
          sparklineData={generateSparklineData("down")} 
          sparklineColor="#f59e0b" 
        />
        <ModernKPICard 
          title="Tickets Urgentes" 
          value={servicesKpis?.ticketsUrgentes || 0} 
          trend={-5.2} 
          subtitle="Alta prioridade" 
          sparklineData={generateSparklineData("down")} 
          sparklineColor="#ef4444" 
        />
        <ModernKPICard 
          title="Taxa de Resolução" 
          value={`${servicesKpis?.taxaResolucao || 0}%`} 
          progress={servicesKpis?.taxaResolucao || 0} 
          progressGoal="Meta: 95%" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tickets por Status */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tickets por Status
              </CardTitle>
              <Headphones className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketsPorStatus || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="quantidade" nameKey="status">
                      {(ticketsPorStatus || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {(ticketsPorStatus || []).map((item: any, index: number) => (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.status}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets por Prioridade */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tickets por Prioridade
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsPorPrioridade || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="prioridade" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {(ticketsPorPrioridade || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{servicesKpis?.ticketsEmAndamento || 0}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{servicesKpis?.ticketsResolvidos || 0}</p>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Headphones className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{servicesKpis?.ticketsAbertos || 0}</p>
                <p className="text-sm text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{servicesKpis?.ticketsUrgentes || 0}</p>
                <p className="text-sm text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}