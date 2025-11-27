import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Clock, TrendingUp, Bot, UserCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

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

const mensagensSemana = [
  { dia: "Seg", enviadas: 245, recebidas: 312, propostas: 18 },
  { dia: "Ter", enviadas: 268, recebidas: 345, propostas: 22 },
  { dia: "Qua", enviadas: 289, recebidas: 378, propostas: 25 },
  { dia: "Qui", enviadas: 312, recebidas: 401, propostas: 28 },
  { dia: "Sex", enviadas: 278, recebidas: 356, propostas: 24 },
  { dia: "Sáb", enviadas: 145, recebidas: 189, propostas: 12 },
  { dia: "Dom", enviadas: 85, recebidas: 112, propostas: 6 },
];

const statusAtendimento = [
  { status: "Aguardando", value: 23 },
  { status: "Em Atendimento", value: 45 },
  { status: "Finalizado Hoje", value: 128 },
  { status: "Bot Ativo", value: 67 },
];

const tempoResposta = [
  { hora: "08h", tempo: 2.5 },
  { hora: "10h", tempo: 3.2 },
  { hora: "12h", tempo: 4.8 },
  { hora: "14h", tempo: 3.5 },
  { hora: "16h", tempo: 2.8 },
  { hora: "18h", tempo: 5.2 },
];

export function DashboardWhatsApp() {
  const totalMensagens = mensagensSemana.reduce((acc, d) => acc + d.enviadas + d.recebidas, 0);
  const totalPropostas = mensagensSemana.reduce((acc, d) => acc + d.propostas, 0);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Semana</p>
                <p className="text-2xl font-bold">{totalMensagens.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>+15% vs semana anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold">68</p>
                <p className="text-xs text-muted-foreground">23 aguardando resposta</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio Resposta</p>
                <p className="text-2xl font-bold">3.5 min</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <Clock className="h-4 w-4" />
                  <span>-20% vs meta</span>
                </div>
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
                <p className="text-sm text-muted-foreground">Propostas Geradas</p>
                <p className="text-2xl font-bold">{totalPropostas}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <Bot className="h-4 w-4" />
                  <span>Via agente IA</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume de Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mensagensSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="enviadas" name="Enviadas" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="recebidas" name="Recebidas" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status dos Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusAtendimento} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="status">
                      {statusAtendimento.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-4 space-y-2">
                {statusAtendimento.map((item, index) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-muted-foreground">{item.status}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tempo de Resposta */}
      <Card className="bg-card border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio de Resposta por Hora</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tempoResposta}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit=" min" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tempo" name="Tempo (min)" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
