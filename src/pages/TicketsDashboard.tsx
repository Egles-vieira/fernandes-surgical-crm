import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Clock, CheckCircle, AlertCircle, TrendingUp, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TicketsDashboard() {
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("data_abertura", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Métricas gerais
  const totalTickets = tickets.length;
  const ticketsAbertos = tickets.filter(t => t.status === "aberto" || t.status === "em_andamento").length;
  const ticketsResolvidos = tickets.filter(t => t.status === "resolvido" || t.status === "fechado").length;
  const tempoMedioResposta = tickets
    .filter(t => t.tempo_primeira_resposta_horas)
    .reduce((acc, t) => acc + (t.tempo_primeira_resposta_horas || 0), 0) / 
    (tickets.filter(t => t.tempo_primeira_resposta_horas).length || 1);
  const tempoMedioResolucao = tickets
    .filter(t => t.tempo_resolucao_horas)
    .reduce((acc, t) => acc + (t.tempo_resolucao_horas || 0), 0) / 
    (tickets.filter(t => t.tempo_resolucao_horas).length || 1);
  const avaliacaoMedia = tickets
    .filter(t => t.avaliacao)
    .reduce((acc, t) => acc + (t.avaliacao || 0), 0) / 
    (tickets.filter(t => t.avaliacao).length || 1);

  // Dados por status
  const statusData = [
    { name: "Aberto", value: tickets.filter(t => t.status === "aberto").length },
    { name: "Em Andamento", value: tickets.filter(t => t.status === "em_andamento").length },
    { name: "Aguardando", value: tickets.filter(t => t.status === "aguardando_cliente").length },
    { name: "Resolvido", value: tickets.filter(t => t.status === "resolvido").length },
    { name: "Fechado", value: tickets.filter(t => t.status === "fechado").length },
  ].filter(d => d.value > 0);

  // Dados por tipo
  const tipoData = [
    { name: "Reclamação", value: tickets.filter(t => t.tipo === "reclamacao").length },
    { name: "Dúvida", value: tickets.filter(t => t.tipo === "duvida").length },
    { name: "Sugestão", value: tickets.filter(t => t.tipo === "sugestao").length },
    { name: "Elogio", value: tickets.filter(t => t.tipo === "elogio").length },
  ].filter(d => d.value > 0);

  // Dados por prioridade
  const prioridadeData = [
    { name: "Baixa", value: tickets.filter(t => t.prioridade === "baixa").length },
    { name: "Normal", value: tickets.filter(t => t.prioridade === "normal").length },
    { name: "Alta", value: tickets.filter(t => t.prioridade === "alta").length },
    { name: "Urgente", value: tickets.filter(t => t.prioridade === "urgente").length },
  ].filter(d => d.value > 0);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard SAC</h1>
          <p className="text-muted-foreground">Métricas e indicadores de atendimento</p>
        </div>

        {/* Cards de Métricas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTickets}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{ticketsAbertos} abertos</Badge>
                <Badge variant="outline">{ticketsResolvidos} resolvidos</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tempoMedioResposta.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Primeira resposta ao cliente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Resolução</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tempoMedioResolucao.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Da abertura até resolução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Índice de Satisfação</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avaliacaoMedia.toFixed(1)}/5</div>
              <p className="text-xs text-muted-foreground">
                {tickets.filter(t => t.avaliacao).length} avaliações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalTickets > 0 ? ((ticketsResolvidos / totalTickets) * 100).toFixed(0) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Tickets resolvidos/fechados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Urgentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.prioridade === "urgente" && (t.status === "aberto" || t.status === "em_andamento")).length}
              </div>
              <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Por Status</TabsTrigger>
            <TabsTrigger value="tipo">Por Tipo</TabsTrigger>
            <TabsTrigger value="prioridade">Por Prioridade</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                  <CardDescription>Tickets por status atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume por Status</CardTitle>
                  <CardDescription>Quantidade de tickets em cada status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tipo" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Tipo</CardTitle>
                  <CardDescription>Tickets por categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tipoData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tipoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume por Tipo</CardTitle>
                  <CardDescription>Principais motivos de contato</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tipoData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prioridade" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Prioridade</CardTitle>
                  <CardDescription>Tickets por nível de urgência</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prioridadeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prioridadeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume por Prioridade</CardTitle>
                  <CardDescription>Distribuição de urgência</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prioridadeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
