import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Trophy, Clock, FileSearch, TrendingUp, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#0ea5e9"];

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

const statusLicitacoes = [
  { status: "Ganhas", value: 18, cor: COLORS[0] },
  { status: "Perdidas", value: 12, cor: COLORS[1] },
  { status: "Em Análise", value: 25, cor: COLORS[2] },
  { status: "Aguardando", value: 8, cor: COLORS[3] },
];

const porMes = [
  { mes: "Jan", participacoes: 12, ganhas: 4 },
  { mes: "Fev", participacoes: 15, ganhas: 5 },
  { mes: "Mar", participacoes: 18, ganhas: 7 },
  { mes: "Abr", participacoes: 14, ganhas: 4 },
  { mes: "Mai", participacoes: 22, ganhas: 8 },
  { mes: "Jun", participacoes: 25, ganhas: 10 },
];

const proximasLicitacoes = [
  { nome: "Pregão Eletrônico 045/2024", orgao: "Hospital Municipal", valor: 450000, prazo: "2 dias" },
  { nome: "Tomada de Preços 012/2024", orgao: "Secretaria de Saúde", valor: 285000, prazo: "5 dias" },
  { nome: "Concorrência 008/2024", orgao: "UPA Central", valor: 780000, prazo: "12 dias" },
];

export function DashboardLicitacoes() {
  const totalParticipacoes = statusLicitacoes.reduce((acc, s) => acc + s.value, 0);
  const taxaSucesso = ((statusLicitacoes[0].value / (statusLicitacoes[0].value + statusLicitacoes[1].value)) * 100).toFixed(0);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Participações</p>
                <p className="text-2xl font-bold">{totalParticipacoes}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+25% vs ano anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Licitações Ganhas</p>
                <p className="text-2xl font-bold">{statusLicitacoes[0].value}</p>
                <p className="text-xs text-emerald-500">{taxaSucesso}% taxa de sucesso</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Análise</p>
                <p className="text-2xl font-bold">{statusLicitacoes[2].value}</p>
                <p className="text-xs text-muted-foreground">Aguardando resultado</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Ganho</p>
                <p className="text-2xl font-bold">{formatCurrency(2450000)}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>Este ano</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <FileSearch className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status das Licitações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusLicitacoes} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="status">
                      {statusLicitacoes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-4 space-y-2">
                {statusLicitacoes.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.cor }} />
                    <span className="text-sm text-muted-foreground">{item.status}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="participacoes" name="Participações" fill={COLORS[4]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganhas" name="Ganhas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximas Licitações */}
      <Card className="bg-card border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Próximas Licitações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {proximasLicitacoes.map((lic) => (
              <div key={lic.nome} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{lic.nome}</p>
                  <p className="text-xs text-muted-foreground">{lic.orgao}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(lic.valor)}</p>
                  <div className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{lic.prazo}</span>
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
