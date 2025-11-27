import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, FileText, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

const COLORS = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

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

const plataformasData = [
  { plataforma: "Bionexo", cotacoes: 145, respondidas: 128, ganhas: 45 },
  { plataforma: "Apoio", cotacoes: 98, respondidas: 85, ganhas: 32 },
  { plataforma: "ME Saúde", cotacoes: 76, respondidas: 68, ganhas: 28 },
  { plataforma: "Webpharma", cotacoes: 54, respondidas: 48, ganhas: 18 },
];

const evolucaoMensal = [
  { mes: "Jan", cotacoes: 85, ganhas: 28 },
  { mes: "Fev", cotacoes: 92, ganhas: 35 },
  { mes: "Mar", cotacoes: 108, ganhas: 42 },
  { mes: "Abr", cotacoes: 115, ganhas: 45 },
  { mes: "Mai", cotacoes: 128, ganhas: 52 },
  { mes: "Jun", cotacoes: 145, ganhas: 58 },
];

export function DashboardPlataformas() {
  const totalCotacoes = plataformasData.reduce((acc, p) => acc + p.cotacoes, 0);
  const totalRespondidas = plataformasData.reduce((acc, p) => acc + p.respondidas, 0);
  const totalGanhas = plataformasData.reduce((acc, p) => acc + p.ganhas, 0);
  const taxaConversao = ((totalGanhas / totalCotacoes) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cotações</p>
                <p className="text-2xl font-bold">{totalCotacoes}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+18% vs mês anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Respondidas</p>
                <p className="text-2xl font-bold">{totalRespondidas}</p>
                <p className="text-xs text-muted-foreground">{((totalRespondidas / totalCotacoes) * 100).toFixed(0)}% do total</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ganhas</p>
                <p className="text-2xl font-bold">{totalGanhas}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <CheckCircle className="h-4 w-4" />
                  <span>{taxaConversao}% conversão</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plataformas Ativas</p>
                <p className="text-2xl font-bold">{plataformasData.length}</p>
                <p className="text-xs text-muted-foreground">Integradas e funcionando</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plataformasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="plataforma" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="cotacoes" name="Cotações" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="respondidas" name="Respondidas" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganhas" name="Ganhas" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                <LineChart data={evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="cotacoes" name="Cotações" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ganhas" name="Ganhas" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
