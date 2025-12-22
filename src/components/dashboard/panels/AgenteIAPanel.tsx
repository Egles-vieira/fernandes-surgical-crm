import { useDashboardAgenteIA } from "@/hooks/useDashboardAgenteIA";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bot, Zap, MessageSquare, Target, AlertTriangle, Clock, Cpu, Activity } from "lucide-react";
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface AgenteIAPanelProps {
  isActive: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ESTADO_LABELS: Record<string, string> = {
  coleta_requisitos: "Coleta",
  identificacao_cliente: "Identificação",
  criacao_oportunidade: "Criação",
  calculo_preco: "Cálculo",
  fechamento: "Fechamento",
};

export function AgenteIAPanel({ isActive }: AgenteIAPanelProps) {
  const { resumo, sessoesPorEstado, toolsPerformance, metricasPorDia, providersUso, isLoading, refreshAll } = useDashboardAgenteIA(isActive);

  const formatNumber = (num: number | undefined) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatMs = (ms: number | undefined) => {
    if (!ms) return "0ms";
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  // Prepare chart data
  const estadoChartData = (sessoesPorEstado || []).map(s => ({
    name: ESTADO_LABELS[s.estado_atual] || s.estado_atual,
    value: s.quantidade,
  }));

  const diaChartData = (metricasPorDia || []).map(d => ({
    data: new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    sessoes: d.sessoes,
    oportunidades: d.oportunidades,
    tokens: Math.round(d.tokens_total / 1000), // em K
  }));

  const providerChartData = (providersUso || []).map(p => ({
    name: p.provider === 'deepseek' ? 'DeepSeek' : p.provider === 'lovable' ? 'Lovable AI' : p.provider,
    chamadas: p.total_chamadas,
    tokens: Math.round((p.tokens_entrada + p.tokens_saida) / 1000),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Agente de Vendas IA V4</h2>
            <p className="text-sm text-muted-foreground">Performance e métricas do agente WhatsApp</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumo?.sessoes_ativas || 0}</p>
                <p className="text-sm text-muted-foreground">Sessões Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumo?.oportunidades_criadas || 0}</p>
                <p className="text-sm text-muted-foreground">Oportunidades Spot</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Cpu className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber((resumo?.total_tokens_entrada || 0) + (resumo?.total_tokens_saida || 0))}</p>
                <p className="text-sm text-muted-foreground">Tokens (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatMs(resumo?.tempo_medio_tools_ms)}</p>
                <p className="text-sm text-muted-foreground">Tempo Médio Tools</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sessões por Estado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Sessões por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadoChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={estadoChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {estadoChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de sessões
              </div>
            )}
          </CardContent>
        </Card>

        {/* Providers LLM */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Uso de Providers LLM
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={providerChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="chamadas" fill="hsl(var(--chart-1))" name="Chamadas" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de providers
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolução Diária */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Evolução Diária (14 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={diaChartData}>
                <defs>
                  <linearGradient id="colorSessoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOportunidades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="sessoes" 
                  stroke="hsl(var(--chart-1))" 
                  fillOpacity={1} 
                  fill="url(#colorSessoes)" 
                  name="Sessões"
                />
                <Area 
                  type="monotone" 
                  dataKey="oportunidades" 
                  stroke="hsl(var(--chart-2))" 
                  fillOpacity={1} 
                  fill="url(#colorOportunidades)" 
                  name="Oportunidades"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados de evolução
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance das Tools */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance das Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          {toolsPerformance && toolsPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tempo Médio</TableHead>
                  <TableHead className="text-right">P95</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead className="text-right">Taxa Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toolsPerformance.map((tool) => (
                  <TableRow key={tool.tool_name}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{tool.tool_name}</code>
                    </TableCell>
                    <TableCell className="text-right">{tool.total_chamadas}</TableCell>
                    <TableCell className="text-right">{formatMs(tool.tempo_medio_ms)}</TableCell>
                    <TableCell className="text-right">{formatMs(tool.p95_ms)}</TableCell>
                    <TableCell className="text-right">
                      {tool.total_erros > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {tool.total_erros}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={tool.taxa_erro_percent > 10 ? "destructive" : tool.taxa_erro_percent > 5 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {tool.taxa_erro_percent?.toFixed(1) || 0}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados de performance
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-4">
          <span>Total Sessões (30d): <strong className="text-foreground">{resumo?.total_sessoes || 0}</strong></span>
          <span>Tools Executadas: <strong className="text-foreground">{resumo?.total_tools_executadas || 0}</strong></span>
          {resumo?.total_erros ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Erros: {resumo.total_erros}
            </span>
          ) : null}
        </div>
        <span>Atualizado: {resumo?.ultima_atualizacao ? new Date(resumo.ultima_atualizacao).toLocaleTimeString('pt-BR') : '--'}</span>
      </div>
    </div>
  );
}
