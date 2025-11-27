import { Users, DollarSign, TrendingUp, Ticket, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(210, 70%, 50%)", "hsl(150, 60%, 45%)"];

const Index = () => {
  const { kpis, vendasPorMes, pipelinePorEtapa, topVendedores, isLoading } = useDashboardHome();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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
      subtitle: "oportunidades",
      icon: DollarSign,
      trend: 12,
      trendUp: true,
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Pipeline Ativo",
      value: formatCurrency(kpis?.valorPipelineAtivo || 0),
      subtitle: "em negociação",
      icon: TrendingUp,
      trend: 8,
      trendUp: true,
      color: "from-violet-500 to-purple-400",
    },
    {
      title: "Taxa de Conversão",
      value: `${kpis?.taxaConversao || 0}%`,
      subtitle: "de fechamento",
      icon: Target,
      trend: 3,
      trendUp: true,
      color: "from-emerald-500 to-green-400",
    },
    {
      title: "Tickets Abertos",
      value: kpis?.ticketsAbertos || 0,
      subtitle: "pendentes",
      icon: Ticket,
      trend: 2,
      trendUp: false,
      color: "from-orange-500 to-amber-400",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{kpis?.totalClientes || 0} clientes</span>
          <span className="mx-2">•</span>
          <span>{kpis?.totalProdutos || 0} produtos</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-10`} />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1">
                {kpi.trendUp ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${kpi.trendUp ? "text-emerald-500" : "text-red-500"}`}>
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
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Tendência de Vendas</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorMes || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(var(--primary))"
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
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Distribuição do Pipeline</CardTitle>
            <p className="text-sm text-muted-foreground">Por etapa do funil</p>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelinePorEtapa || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="quantidade"
                    nameKey="etapa"
                  >
                    {(pipelinePorEtapa || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(pipelinePorEtapa || []).slice(0, 4).map((item, index) => (
                <div key={item.etapa} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-muted-foreground truncate">{item.etapa}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Funil de Vendas */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Funil de Vendas</CardTitle>
            <p className="text-sm text-muted-foreground">Quantidade e valor por etapa</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelinePorEtapa || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="etapa"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "valor" ? formatCurrency(value) : value,
                      name === "valor" ? "Valor" : "Quantidade",
                    ]}
                  />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valor" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Vendedores */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Top Vendedores</CardTitle>
            <p className="text-sm text-muted-foreground">Por atingimento de meta</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(topVendedores || []).length > 0 ? (
              topVendedores?.map((vendedor, index) => (
                <div key={vendedor.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${
                          index === 0
                            ? "from-yellow-400 to-orange-500"
                            : index === 1
                            ? "from-gray-300 to-gray-400"
                            : index === 2
                            ? "from-amber-600 to-amber-700"
                            : "from-slate-400 to-slate-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {vendedor.nome.length > 15 ? `${vendedor.nome.substring(0, 15)}...` : vendedor.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(vendedor.realizado)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        vendedor.percentual >= 100
                          ? "text-emerald-500"
                          : vendedor.percentual >= 70
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                    >
                      {vendedor.percentual}%
                    </span>
                  </div>
                  <Progress value={Math.min(vendedor.percentual, 100)} className="h-2" />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum vendedor com meta</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
