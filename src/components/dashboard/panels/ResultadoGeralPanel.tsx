import { useDashboardHome } from "@/hooks/useDashboardHome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Info, Sparkles, TrendingUp, Zap } from "lucide-react";
import {
  formatCurrency,
  CHART_COLORS,
  generateSparklineData,
  ModernKPICard,
  GaugeChart,
  CustomTooltip
} from "../shared/ChartComponents";
import promoBannerBg from "@/assets/promo-banner-bg.jpg";

function PromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl p-6">
      {/* Background image */}
      <img 
        src={promoBannerBg} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Primary color overlay */}
      <div className="absolute inset-0 bg-primary/85" />

      {/* Decorative icons on left */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-30">
        <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center ml-4">
          <Zap className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-6">
        {/* Text content */}
        <div className="flex-1 pl-20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary-foreground/80" />
            <span className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">
              Inteligência Artificial
            </span>
          </div>
          <h3 className="text-xl font-bold text-primary-foreground mb-1">
            Automatize suas cotações com IA
          </h3>
          <p className="text-sm text-primary-foreground/80 max-w-lg">
            Deixe a IA analisar e sugerir produtos automaticamente. Reduza tempo de resposta em até 80% e aumente suas conversões.
          </p>
        </div>

        {/* CTA Button */}
        <Button 
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-5 text-base shadow-lg hover:shadow-xl transition-all"
          onClick={() => window.location.href = '/plataformas/dashboard-ia'}
        >
          Quero conhecer!
        </Button>
      </div>
    </div>
  );
}

export function ResultadoGeralPanel() {
  const {
    kpis,
    vendasPorMes,
    pipelinePorEtapa,
    topVendedores,
    isLoading
  } = useDashboardHome();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-lg lg:col-span-2" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  const ticketMedio = kpis?.totalVendas && kpis.totalVendas > 0 ? kpis.valorPipelineAtivo / kpis.totalVendas : 0;
  const metaMensal = 500000;
  const realizadoMes = vendasPorMes?.[vendasPorMes.length - 1]?.valor || 0;
  const progressoMeta = Math.min(realizadoMes / metaMensal * 100, 100);

  return (
    <div className="space-y-6">
      {/* Promo Banner */}
      <PromoBanner />

      {/* Row 1 - 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernKPICard title="Total de Vendas" value={kpis?.totalVendas || 0} trend={12.5} progress={progressoMeta} progressGoal={`Meta: ${formatCurrency(metaMensal)}`} sparklineData={generateSparklineData("up")} sparklineColor="#10b981" />
        <ModernKPICard title="Pipeline Ativo" value={formatCurrency(kpis?.valorPipelineAtivo || 0)} trend={8.3} subtitle="Oportunidades em andamento" sparklineData={generateSparklineData("up")} sparklineColor="#06b6d4" />
        <ModernKPICard title="Taxa de Conversão" value={`${kpis?.taxaConversao || 0}%`} trend={-2.1} progress={kpis?.taxaConversao || 0} progressGoal="Meta: 35%" sparklineData={generateSparklineData("down")} sparklineColor="#ef4444" />
        <ModernKPICard title="Tickets Abertos" value={kpis?.ticketsAbertos || 0} trend={-5.2} subtitle="Aguardando atendimento" sparklineData={generateSparklineData("down")} sparklineColor="#f59e0b" />
      </div>

      {/* Row 2 - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Customer Engagement Style */}
        <Card className="lg:col-span-2 bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tendência de Vendas
                </CardTitle>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(vendasPorMes?.reduce((acc, m) => acc + m.valor, 0) || 0)}
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                  <p className="text-lg font-semibold text-foreground">{kpis?.totalClientes || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(ticketMedio)}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorMes || []}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="valor" name="Valor" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorValor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gauge Chart - Satisfaction Score Style */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Performance Geral
              </CardTitle>
              <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <GaugeChart value={kpis?.taxaConversao || 0} />
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Taxa de conversão do funil de vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 - Pipeline and Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Donut Chart with Side Legend */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline por Etapa
              </CardTitle>
              <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pipelinePorEtapa || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="quantidade" nameKey="etapa">
                      {(pipelinePorEtapa || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {(pipelinePorEtapa || []).map((item, index) => (
                  <div key={item.etapa} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{
                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                      }} />
                      <span className="text-sm text-muted-foreground">{item.etapa}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{item.quantidade}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({formatCurrency(item.valor)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Funnel Bar Chart */}
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
                <BarChart data={pipelinePorEtapa || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="etapa" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {(pipelinePorEtapa || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4 - Additional KPIs and Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4">
          <ModernKPICard title="Total Clientes" value={kpis?.totalClientes || 0} trend={5.8} subtitle="Base ativa" />
          <ModernKPICard title="Produtos" value={kpis?.totalProdutos || 0} trend={2.3} subtitle="Catálogo ativo" />
        </div>

        {/* Top Sellers */}
        <Card className="lg:col-span-2 bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Vendedores
              </CardTitle>
              <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(topVendedores || []).map((vendedor, index) => (
                <div key={vendedor.id} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {vendedor.nome}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(vendedor.realizado)} / {formatCurrency(vendedor.meta)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={vendedor.percentual} className="h-2 flex-1" />
                      <span className={`text-xs font-medium ${vendedor.percentual >= 100 ? "text-emerald-500" : vendedor.percentual >= 70 ? "text-amber-500" : "text-red-500"}`}>
                        {vendedor.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!topVendedores || topVendedores.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum vendedor encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
