import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}:{" "}
            {typeof entry.value === "number" && entry.value > 1000
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Mock data for different tabs
const vendasData = [
  { mes: "Jan", valor: 45000, meta: 50000 },
  { mes: "Fev", valor: 52000, meta: 50000 },
  { mes: "Mar", valor: 48000, meta: 55000 },
  { mes: "Abr", valor: 61000, meta: 55000 },
  { mes: "Mai", valor: 55000, meta: 60000 },
  { mes: "Jun", valor: 67000, meta: 60000 },
];

const produtosData = [
  { categoria: "Categoria A", quantidade: 120, valor: 85000 },
  { categoria: "Categoria B", quantidade: 98, valor: 72000 },
  { categoria: "Categoria C", quantidade: 86, valor: 54000 },
  { categoria: "Categoria D", quantidade: 65, valor: 43000 },
  { categoria: "Categoria E", quantidade: 45, valor: 32000 },
];

const plataformasData = [
  { plataforma: "Portal A", cotacoes: 45, convertidas: 28 },
  { plataforma: "Portal B", cotacoes: 38, convertidas: 22 },
  { plataforma: "Portal C", cotacoes: 32, convertidas: 18 },
  { plataforma: "Portal D", cotacoes: 25, convertidas: 15 },
];

const whatsappData = [
  { dia: "Seg", mensagens: 120, conversas: 45 },
  { dia: "Ter", mensagens: 145, conversas: 52 },
  { dia: "Qua", mensagens: 132, conversas: 48 },
  { dia: "Qui", mensagens: 158, conversas: 61 },
  { dia: "Sex", mensagens: 142, conversas: 55 },
  { dia: "Sáb", mensagens: 85, conversas: 32 },
  { dia: "Dom", mensagens: 45, conversas: 18 },
];

const licitacoesData = [
  { status: "Ganhas", value: 12 },
  { status: "Perdidas", value: 8 },
  { status: "Em Análise", value: 15 },
  { status: "Aguardando", value: 5 },
];

const npsData = [
  { mes: "Jan", promotores: 65, neutros: 25, detratores: 10 },
  { mes: "Fev", promotores: 68, neutros: 22, detratores: 10 },
  { mes: "Mar", promotores: 70, neutros: 20, detratores: 10 },
  { mes: "Abr", promotores: 72, neutros: 18, detratores: 10 },
  { mes: "Mai", promotores: 75, neutros: 17, detratores: 8 },
  { mes: "Jun", promotores: 78, neutros: 15, detratores: 7 },
];

const clienteData = [
  { segmento: "Premium", quantidade: 45 },
  { segmento: "Regular", quantidade: 120 },
  { segmento: "Básico", quantidade: 85 },
  { segmento: "Novo", quantidade: 65 },
];

export function DashboardChartTabs() {
  return (
    <Card className="bg-card border-border/30 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Análise por Área
          </CardTitle>
          <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vendas" className="w-full">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0">
            <TabsTrigger
              value="vendas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              Vendas
            </TabsTrigger>
            <TabsTrigger
              value="produtos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              Produtos
            </TabsTrigger>
            <TabsTrigger
              value="plataformas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              Plataformas
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              WhatsApp
            </TabsTrigger>
            <TabsTrigger
              value="licitacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              Licitações
            </TabsTrigger>
            <TabsTrigger
              value="nps"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              NPS
            </TabsTrigger>
            <TabsTrigger
              value="cliente"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
            >
              Cliente
            </TabsTrigger>
          </TabsList>

          {/* Vendas Tab */}
          <TabsContent value="vendas" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasData}>
                  <defs>
                    <linearGradient id="colorValorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="valor" name="Realizado" stroke={CHART_COLORS[0]} fill="url(#colorValorVendas)" />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke={CHART_COLORS[3]} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Produtos Tab */}
          <TabsContent value="produtos" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produtosData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="categoria" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="quantidade" name="Quantidade" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Plataformas Tab */}
          <TabsContent value="plataformas" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plataformasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="plataforma" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="cotacoes" name="Cotações" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="convertidas" name="Convertidas" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={whatsappData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="mensagens" name="Mensagens" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="conversas" name="Conversas" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Licitações Tab */}
          <TabsContent value="licitacoes" className="mt-4">
            <div className="h-64 flex items-center justify-center">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={licitacoesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="status"
                      label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {licitacoesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-6 space-y-2">
                {licitacoesData.map((item, index) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{item.status}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* NPS Tab */}
          <TabsContent value="nps" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={npsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="promotores" name="Promotores" stackId="1" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="neutros" name="Neutros" stackId="1" stroke={CHART_COLORS[3]} fill={CHART_COLORS[3]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="detratores" name="Detratores" stackId="1" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Cliente Tab */}
          <TabsContent value="cliente" className="mt-4">
            <div className="h-64 flex items-center justify-center">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clienteData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="quantidade"
                      nameKey="segmento"
                    >
                      {clienteData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-6 space-y-2">
                {clienteData.map((item, index) => (
                  <div key={item.segmento} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{item.segmento}</span>
                    <span className="text-sm font-semibold text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
