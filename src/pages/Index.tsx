import { Users, DollarSign, TrendingUp, Ticket, Target, ArrowUpRight, ArrowDownRight, Package, ShoppingCart, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardHome } from "@/hooks/useDashboardHome";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

// Mini sparkline data for KPI cards
const generateSparkline = (trend: boolean) => {
  const base = trend ? [30, 35, 32, 40, 38, 45, 50] : [50, 45, 48, 40, 42, 38, 35];
  return base.map((v) => ({ value: v + Math.random() * 10 }));
};

const FUNNEL_COLORS = [
  "hsl(220, 14%, 96%)",
  "hsl(217, 91%, 90%)",
  "hsl(217, 91%, 70%)",
  "hsl(217, 91%, 60%)",
  "hsl(217, 91%, 50%)"
];

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(220, 14%, 90%)"
];

const Index = () => {
  const {
    kpis,
    pipelinePorEtapa,
    topVendedores,
    isLoading
  } = useDashboardHome();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const ticketMedio = kpis?.totalVendas && kpis.totalVendas > 0 
    ? kpis.valorPipelineAtivo / kpis.totalVendas 
    : 0;

  // KPI Cards data
  const kpiCards = [
    {
      title: "Pipeline Ativo",
      value: formatCurrency(kpis?.valorPipelineAtivo || 0),
      subtitle: "em negociação",
      trend: 14,
      trendUp: true,
      sparkline: generateSparkline(true)
    },
    {
      title: "Receita Mensal",
      value: formatCurrency(ticketMedio * (kpis?.totalVendas || 0) * 0.3),
      subtitle: `${kpis?.totalVendas || 0} vendas`,
      trend: 8,
      trendUp: true,
      sparkline: generateSparkline(true)
    },
    {
      title: "Clientes Ativos",
      value: formatCompact(kpis?.totalClientes || 0),
      subtitle: "cadastrados",
      trend: 27,
      trendUp: true,
      sparkline: generateSparkline(true)
    }
  ];

  // Funnel data based on pipeline
  const funnelData = pipelinePorEtapa?.map((item, index) => ({
    name: item.etapa,
    value: item.quantidade,
    color: FUNNEL_COLORS[index % FUNNEL_COLORS.length]
  })) || [];

  // Calculate funnel widths
  const maxFunnelValue = Math.max(...funnelData.map(d => d.value), 1);

  // Device/Source distribution
  const deviceData = [
    { name: "Direto", value: 60, color: DONUT_COLORS[0] },
    { name: "Indicação", value: 30, color: DONUT_COLORS[1] },
    { name: "Outros", value: 10, color: DONUT_COLORS[2] }
  ];

  // Performance by category (horizontal bars)
  const performanceData = topVendedores?.slice(0, 5).map(v => ({
    name: v.nome.split(' ')[0],
    percentual: v.percentual,
    realizado: v.realizado
  })) || [];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <span>Últimos 30 dias</span>
        </div>
      </div>

      {/* Top KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="border border-border/40 shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      kpi.trendUp 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {kpi.trendUp ? "+" : "-"}{kpi.trend}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </div>
                <div className="w-20 h-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpi.sparkline}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={kpi.trendUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Funnel */}
      <Card className="border border-border/40 shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {funnelData.map((item, index) => {
              const heightPercent = (item.value / maxFunnelValue) * 100;
              const widthPercent = 100 - (index * 15);
              return (
                <div key={item.name} className="flex flex-col items-center flex-1 h-full justify-end">
                  <div className="text-xs text-muted-foreground mb-1 text-center truncate w-full">
                    {item.name}
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-2">
                    {formatCompact(item.value)}
                  </div>
                  <div 
                    className="w-full rounded-t-md transition-all hover:opacity-80 relative group"
                    style={{ 
                      height: `${Math.max(heightPercent, 20)}%`,
                      backgroundColor: index === 2 ? "hsl(var(--primary))" : `hsl(217, 91%, ${95 - index * 12}%)`,
                      maxWidth: `${widthPercent}%`
                    }}
                  >
                    {index === 2 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-medium">Insights</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart - Source Distribution */}
        <Card className="border border-border/40 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Origem dos Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {deviceData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-medium text-foreground ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horizontal Bar Chart - Top Performers */}
        <Card className="border border-border/40 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Performance Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.length > 0 ? performanceData.map((item, index) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium text-foreground">{item.percentual}%</span>
                  </div>
                  <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(item.percentual, 100)}%`,
                        backgroundColor: index === 0 
                          ? "hsl(var(--primary))" 
                          : index === 1 
                            ? "hsl(var(--success))" 
                            : "hsl(38, 92%, 50%)"
                      }}
                    />
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum vendedor com meta cadastrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShoppingCart, label: "Pedidos", value: kpis?.totalVendas || 0, color: "text-primary" },
          { icon: Users, label: "Clientes", value: kpis?.totalClientes || 0, color: "text-success" },
          { icon: Package, label: "Produtos", value: kpis?.totalProdutos || 0, color: "text-warning" },
          { icon: Ticket, label: "Tickets", value: kpis?.ticketsAbertos || 0, color: "text-destructive" }
        ].map((stat, index) => (
          <Card key={index} className="border border-border/40 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{formatCompact(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;