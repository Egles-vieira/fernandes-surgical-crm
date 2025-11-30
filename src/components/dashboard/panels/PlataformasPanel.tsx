import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Info, FileSpreadsheet, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency, CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";

interface PlataformasPanelProps {
  isActive: boolean;
}

export function PlataformasPanel({ isActive }: PlataformasPanelProps) {
  // KPIs de Plataformas EDI - usando Materialized View
  const { data: plataformasKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["plataformas-panel-kpis-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_plataformas_resumo")
        .select("*")
        .single();

      if (error) throw error;
      
      return {
        totalCotacoes: data?.total_cotacoes || 0,
        totalItens: data?.total_itens || 0,
        totalPlataformas: data?.total_plataformas || 0,
        cotacoesPendentes: data?.cotacoes_pendentes || 0,
        cotacoesRespondidas: data?.cotacoes_respondidas || 0,
        valorTotal: data?.valor_total || 0,
        taxaResposta: data?.taxa_resposta || 0
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Cotações por status - usando Materialized View
  const { data: cotacoesPorStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plataformas-panel-status-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_cotacoes_por_status")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = isLoadingKpis || isLoadingStatus;

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
          title="Total Cotações" 
          value={plataformasKpis?.totalCotacoes || 0} 
          trend={15.2} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#0ea5e9" 
        />
        <ModernKPICard 
          title="Cotações Pendentes" 
          value={plataformasKpis?.cotacoesPendentes || 0} 
          trend={-8.5} 
          subtitle="Aguardando resposta" 
          sparklineData={generateSparklineData("down")} 
          sparklineColor="#f59e0b" 
        />
        <ModernKPICard 
          title="Taxa de Resposta" 
          value={`${plataformasKpis?.taxaResposta || 0}%`} 
          progress={plataformasKpis?.taxaResposta || 0} 
          progressGoal="Meta: 95%" 
        />
        <ModernKPICard 
          title="Valor Respondido" 
          value={formatCurrency(plataformasKpis?.valorTotal || 0)} 
          trend={12.3} 
          subtitle="Total cotado" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status das Cotações - Pie Chart */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cotações por Status
              </CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cotacoesPorStatus || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="quantidade" nameKey="status">
                      {(cotacoesPorStatus || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {(cotacoesPorStatus || []).map((item: any, index: number) => (
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

        {/* Status das Cotações - Bar Chart */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distribuição por Status
              </CardTitle>
              <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cotacoesPorStatus || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {(cotacoesPorStatus || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <FileSpreadsheet className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{plataformasKpis?.totalPlataformas || 0}</p>
                <p className="text-sm text-muted-foreground">Plataformas Ativas</p>
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
                <p className="text-2xl font-bold text-foreground">{plataformasKpis?.cotacoesRespondidas || 0}</p>
                <p className="text-sm text-muted-foreground">Cotações Respondidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{plataformasKpis?.totalItens || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}