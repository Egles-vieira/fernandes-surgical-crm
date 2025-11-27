import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Meh, Frown, TrendingUp, MessageCircle, Star } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const evolucaoNPS = [
  { mes: "Jan", promotores: 62, neutros: 28, detratores: 10, nps: 52 },
  { mes: "Fev", promotores: 65, neutros: 25, detratores: 10, nps: 55 },
  { mes: "Mar", promotores: 68, neutros: 24, detratores: 8, nps: 60 },
  { mes: "Abr", promotores: 70, neutros: 22, detratores: 8, nps: 62 },
  { mes: "Mai", promotores: 72, neutros: 20, detratores: 8, nps: 64 },
  { mes: "Jun", promotores: 75, neutros: 18, detratores: 7, nps: 68 },
];

const distribuicaoAtual = [
  { name: "Promotores", value: 75, icon: Smile },
  { name: "Neutros", value: 18, icon: Meh },
  { name: "Detratores", value: 7, icon: Frown },
];

const comentariosRecentes = [
  { cliente: "Hospital Santa Clara", nota: 10, comentario: "Excelente atendimento e entrega rápida!", data: "Hoje" },
  { cliente: "Clínica São José", nota: 9, comentario: "Produtos de qualidade, equipe atenciosa.", data: "Ontem" },
  { cliente: "UPA Central", nota: 6, comentario: "Entrega atrasou 2 dias.", data: "3 dias atrás" },
  { cliente: "Farmácia Popular", nota: 10, comentario: "Sempre superando expectativas!", data: "5 dias atrás" },
];

export function DashboardNPS() {
  const npsAtual = 68;
  const totalRespostas = 1245;

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">NPS Atual</p>
                <p className="text-4xl font-bold text-emerald-500">{npsAtual}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+6 pts vs mês anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promotores</p>
                <p className="text-2xl font-bold">{distribuicaoAtual[0].value}%</p>
                <p className="text-xs text-muted-foreground">Notas 9-10</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Smile className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Detratores</p>
                <p className="text-2xl font-bold">{distribuicaoAtual[2].value}%</p>
                <p className="text-xs text-muted-foreground">Notas 0-6</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Frown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Respostas</p>
                <p className="text-2xl font-bold">{totalRespostas.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Este ano</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Evolução do NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoNPS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="promotores" name="Promotores" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="neutros" name="Neutros" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="detratores" name="Detratores" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribuicaoAtual} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name">
                      {distribuicaoAtual.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-4 space-y-3">
                {distribuicaoAtual.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${COLORS[index]}20` }}>
                        <Icon className="h-4 w-4" style={{ color: COLORS[index] }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-lg font-bold">{item.value}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comentários Recentes */}
      <Card className="bg-card border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Comentários Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comentariosRecentes.map((c, index) => (
              <div key={index} className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${c.nota >= 9 ? "bg-emerald-500" : c.nota >= 7 ? "bg-amber-500" : "bg-red-500"}`}>
                  {c.nota}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.cliente}</p>
                    <span className="text-xs text-muted-foreground">{c.data}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{c.comentario}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
