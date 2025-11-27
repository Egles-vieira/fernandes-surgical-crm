import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info, TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, Users } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

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

// Mock data
const vendasMensais = [
  { mes: "Jan", realizado: 125000, meta: 150000 },
  { mes: "Fev", realizado: 145000, meta: 150000 },
  { mes: "Mar", realizado: 168000, meta: 160000 },
  { mes: "Abr", realizado: 155000, meta: 170000 },
  { mes: "Mai", realizado: 182000, meta: 180000 },
  { mes: "Jun", realizado: 195000, meta: 190000 },
];

const pipelineData = [
  { etapa: "Prospecção", quantidade: 45, valor: 450000 },
  { etapa: "Qualificação", quantidade: 32, valor: 380000 },
  { etapa: "Proposta", quantidade: 18, valor: 290000 },
  { etapa: "Negociação", quantidade: 12, valor: 185000 },
  { etapa: "Fechamento", quantidade: 8, valor: 120000 },
];

const topVendedores = [
  { nome: "Carlos Silva", realizado: 85000, meta: 100000 },
  { nome: "Maria Santos", realizado: 72000, meta: 80000 },
  { nome: "João Oliveira", realizado: 68000, meta: 75000 },
  { nome: "Ana Costa", realizado: 55000, meta: 70000 },
];

export function DashboardVendas() {
  const totalRealizado = vendasMensais.reduce((acc, m) => acc + m.realizado, 0);
  const totalMeta = vendasMensais.reduce((acc, m) => acc + m.meta, 0);
  const progressoMeta = (totalRealizado / totalMeta) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRealizado)}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meta do Período</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMeta)}</p>
                <Progress value={progressoMeta} className="h-2 mt-2 w-32" />
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold">247</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8.3%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRealizado / 247)}</p>
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <TrendingDown className="h-4 w-4" />
                  <span>-2.1%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Mensais vs Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasMensais}>
                  <defs>
                    <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="realizado" name="Realizado" stroke={COLORS[0]} fill="url(#colorRealizado)" />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke={COLORS[3]} strokeDasharray="5 5" dot={false} />
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
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="etapa" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((_, index) => (
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
            {topVendedores.map((vendedor, index) => (
              <div key={vendedor.nome} className="flex items-center gap-4">
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
                    <Progress value={(vendedor.realizado / vendedor.meta) * 100} className="h-2 flex-1" />
                    <span className={`text-xs font-medium ${(vendedor.realizado / vendedor.meta) >= 1 ? "text-emerald-500" : "text-amber-500"}`}>
                      {((vendedor.realizado / vendedor.meta) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
