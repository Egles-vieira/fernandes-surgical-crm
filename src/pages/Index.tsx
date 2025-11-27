import { Users, DollarSign, TrendingUp, Ticket, Target, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardHome } from "@/hooks/useDashboardHome";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CHART_COLORS = [
  "hsl(186, 80%, 50%)",   // primary - cyan
  "hsl(280, 70%, 60%)",   // secondary - purple
  "hsl(142, 76%, 36%)",   // success - emerald
  "hsl(38, 92%, 50%)",    // warning - amber
  "hsl(186, 90%, 38%)",   // tertiary - deeper cyan
];

const Index = () => {
  const { kpis, vendasPorMes, pipelinePorEtapa, topVendedores, isLoading } = useDashboardHome();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total de Vendas",
      value: kpis?.totalVendas || 0,
      subtitle: "oportunidades no pipeline",
      icon: DollarSign,
      trend: 12,
      trendUp: true,
      gradient: "gradient-primary",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Pipeline Ativo",
      value: formatCurrency(kpis?.valorPipelineAtivo || 0),
      subtitle: "em negociação",
      icon: TrendingUp,
      trend: 8,
      trendUp: true,
      gradient: "gradient-secondary",
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
    {
      title: "Taxa de Conversão",
      value: `${kpis?.taxaConversao || 0}%`,
      subtitle: "de fechamento",
      icon: Target,
      trend: 3,
      trendUp: true,
      gradient: "gradient-success",
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "Tickets Abertos",
      value: kpis?.ticketsAbertos || 0,
      subtitle: "pendentes de resolução",
      icon: Ticket,
      trend: 2,
      trendUp: false,
      gradient: "bg-warning",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-4 px-4 py-2 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{kpis?.totalClientes || 0}</span>
            <span className="text-muted-foreground">clientes</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-secondary" />
            <span className="font-medium text-foreground">{kpis?.totalProdutos || 0}</span>
            <span className="text-muted-foreground">produtos</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((kpi, index) => (
          <Card
            key={index}
            className="group relative overflow-hidden border border-border/50 shadow-elegant hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${kpi.gradient}`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${kpi.iconBg} transition-transform group-hover:scale-110`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-border/50">
                {kpi.trendUp ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                <span className={`text-sm font-semibold ${kpi.trendUp ? "text-success" : "text-destructive"}`}>
                  {kpi.trend}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Vendas por Mês */}
        <Card className="lg:col-span-2 border border-border/50 shadow-elegant">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Tendência de Vendas</CardTitle>
                <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorMes || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(186, 80%, 50%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(186, 80%, 50%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px hsla(186, 80%, 50%, 0.12)",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                    labelStyle={{ color: "hsl(220, 13%, 18%)", fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(186, 80%, 50%)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Distribuição Pipeline */}
        <Card className="border border-border/50 shadow-elegant">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Pipeline</CardTitle>
                <p className="text-sm text-muted-foreground">Distribuição por etapa</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelinePorEtapa || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="quantidade"
                    nameKey="etapa"
                  >
                    {(pipelinePorEtapa || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px hsla(186, 80%, 50%, 0.12)",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(pipelinePorEtapa || []).map((item, index) => (
                <div key={item.etapa} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground truncate text-xs">{item.etapa}</span>
                  <span className="ml-auto font-medium text-foreground text-xs">{item.quantidade}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Funil de Vendas */}
        <Card className="lg:col-span-2 border border-border/50 shadow-elegant">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Funil de Vendas</CardTitle>
                <p className="text-sm text-muted-foreground">Quantidade por etapa do pipeline</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelinePorEtapa || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(186, 80%, 50%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(186, 90%, 38%)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis
                    dataKey="etapa"
                    tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px hsla(186, 80%, 50%, 0.12)",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "valor" ? formatCurrency(value) : value,
                      name === "valor" ? "Valor" : "Quantidade",
                    ]}
                  />
                  <Bar dataKey="quantidade" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Vendedores */}
        <Card className="border border-border/50 shadow-elegant">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Top Vendedores</CardTitle>
                <p className="text-sm text-muted-foreground">Atingimento de meta</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topVendedores || []).length > 0 ? (
              topVendedores?.map((vendedor, index) => (
                <div key={vendedor.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0
                            ? "gradient-primary"
                            : index === 1
                            ? "bg-muted-foreground"
                            : index === 2
                            ? "bg-warning"
                            : "bg-muted-foreground/50"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {vendedor.nome.length > 18 ? `${vendedor.nome.substring(0, 18)}...` : vendedor.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(vendedor.realizado)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold px-2 py-1 rounded-lg ${
                        vendedor.percentual >= 100
                          ? "bg-success/10 text-success"
                          : vendedor.percentual >= 70
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {vendedor.percentual}%
                    </span>
                  </div>
                  <Progress value={Math.min(vendedor.percentual, 100)} className="h-1.5" />
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum vendedor com meta cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
