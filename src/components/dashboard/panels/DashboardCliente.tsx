import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserCheck, TrendingUp, Building2, MapPin } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from "recharts";

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
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const segmentosCliente = [
  { segmento: "Premium", quantidade: 85, valor: 4500000 },
  { segmento: "Gold", quantidade: 156, valor: 2800000 },
  { segmento: "Regular", quantidade: 342, valor: 1200000 },
  { segmento: "Básico", quantidade: 518, valor: 450000 },
];

const porRegiao = [
  { regiao: "Sudeste", quantidade: 485 },
  { regiao: "Sul", quantidade: 245 },
  { regiao: "Nordeste", quantidade: 178 },
  { regiao: "Centro-Oeste", quantidade: 112 },
  { regiao: "Norte", quantidade: 81 },
];

const evolucaoClientes = [
  { mes: "Jan", novos: 28, ativos: 980, inativos: 45 },
  { mes: "Fev", novos: 35, ativos: 1005, inativos: 42 },
  { mes: "Mar", novos: 42, ativos: 1035, inativos: 38 },
  { mes: "Abr", novos: 38, ativos: 1062, inativos: 35 },
  { mes: "Mai", novos: 45, ativos: 1095, inativos: 32 },
  { mes: "Jun", novos: 52, ativos: 1135, inativos: 28 },
];

const topClientes = [
  { nome: "Hospital São Lucas", faturamento: 850000, pedidos: 45 },
  { nome: "Clínica Santa Maria", faturamento: 620000, pedidos: 38 },
  { nome: "UBS Central", faturamento: 480000, pedidos: 32 },
  { nome: "Farmácia Popular", faturamento: 350000, pedidos: 28 },
  { nome: "Hospital Municipal", faturamento: 290000, pedidos: 24 },
];

export function DashboardCliente() {
  const totalClientes = segmentosCliente.reduce((acc, s) => acc + s.quantidade, 0);
  const clientesAtivos = 1135;
  const novosEsteMes = 52;

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{totalClientes.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8.5% vs ano anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold">{clientesAtivos.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{((clientesAtivos / totalClientes) * 100).toFixed(0)}% do total</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos Este Mês</p>
                <p className="text-2xl font-bold">{novosEsteMes}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <UserPlus className="h-4 w-4" />
                  <span>+15% vs mês anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(7850)}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+5.2%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes por Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={segmentosCliente} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="quantidade" nameKey="segmento">
                      {segmentosCliente.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-4 space-y-2">
                {segmentosCliente.map((item, index) => (
                  <div key={item.segmento} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-muted-foreground">{item.segmento}</span>
                    <span className="text-sm font-semibold">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição por Região</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porRegiao} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="regiao" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Clientes" radius={[0, 4, 4, 0]}>
                    {porRegiao.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução e Top Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Evolução de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoClientes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="novos" name="Novos" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ativos" name="Ativos" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Clientes por Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClientes.map((cliente, index) => (
                <div key={cliente.nome} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground">{cliente.pedidos} pedidos</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(cliente.faturamento)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
