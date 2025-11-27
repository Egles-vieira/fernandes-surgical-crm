import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Target, ShoppingCart, Ticket } from "lucide-react";
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
  Legend,
} from "recharts";
import { useDashboardHome } from "@/hooks/useDashboardHome";

const COLORS = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: {typeof entry.value === "number" && entry.value > 100 ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardVendas() {
  const { kpis, vendasPorMes, pipelinePorEtapa, topVendedores, isLoading } = useDashboardHome();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border/30">
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border-border/30">
            <CardContent className="p-4">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="bg-card border-border/30">
            <CardContent className="p-4">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold">{kpis?.totalVendas || 0}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>Oportunidades</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Ativo</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis?.valorPipelineAtivo || 0)}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Em negociação</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{kpis?.taxaConversao || 0}%</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>Fechamentos</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tickets Abertos</p>
                <p className="text-2xl font-bold">{kpis?.ticketsAbertos || 0}</p>
                <div className="flex items-center gap-1 text-sm text-amber-500">
                  <Ticket className="h-4 w-4" />
                  <span>Pendentes</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Ticket className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorMes || []}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="valor" name="Valor" stroke={COLORS[0]} fill="url(#colorValor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelinePorEtapa || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="etapa" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {(pipelinePorEtapa || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendedores */}
      <Card className="bg-card border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(topVendedores || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum vendedor encontrado</p>
            ) : (
              (topVendedores || []).map((vendedor, index) => (
                <div key={vendedor.id} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{vendedor.nome}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(vendedor.realizado)} / {formatCurrency(vendedor.meta)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={vendedor.percentual} className="h-2 flex-1" />
                      <span className={`text-xs font-medium ${vendedor.percentual >= 100 ? "text-emerald-500" : "text-amber-500"}`}>
                        {vendedor.percentual.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
