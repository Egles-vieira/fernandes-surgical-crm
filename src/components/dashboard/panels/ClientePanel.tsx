import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Users, Building2, UserCheck, TrendingUp, MapPin } from "lucide-react";
import { formatCurrency, CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";
import { startOfMonth, subMonths, format } from "date-fns";

interface ClientePanelProps {
  isActive: boolean;
}

export function ClientePanel({ isActive }: ClientePanelProps) {
  // KPIs de Clientes
  const { data: clientesKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["clientes-panel-kpis"],
    queryFn: async () => {
      const [clientesRes, contatosRes] = await Promise.all([
        supabase.from("clientes").select("id, natureza, lim_credito, created_at", { count: "exact" }),
        supabase.from("contatos").select("id", { count: "exact", head: true })
      ]);

      const clientes = clientesRes.data || [];
      const totalClientes = clientesRes.count || 0;
      const totalContatos = contatosRes.count || 0;
      
      const clientesPJ = clientes.filter(c => c.natureza === "Juridica").length;
      const clientesPF = clientes.filter(c => c.natureza === "Fisica").length;
      const limiteTotal = clientes.reduce((acc, c) => acc + (c.lim_credito || 0), 0);
      
      // Clientes novos este mês
      const inicioMes = startOfMonth(new Date()).toISOString();
      const clientesNovosMes = clientes.filter(c => c.created_at >= inicioMes).length;

      return {
        totalClientes,
        totalContatos,
        clientesPJ,
        clientesPF,
        limiteTotal,
        clientesNovosMes
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Clientes por natureza
  const { data: clientesPorNatureza, isLoading: isLoadingNatureza } = useQuery({
    queryKey: ["clientes-panel-natureza"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("natureza");
      
      const naturezaMap: Record<string, { natureza: string; quantidade: number }> = {
        juridica: { natureza: "Pessoa Jurídica", quantidade: 0 },
        fisica: { natureza: "Pessoa Física", quantidade: 0 },
      };

      (data || []).forEach((cliente) => {
        const natureza = cliente.natureza || "juridica";
        if (naturezaMap[natureza]) {
          naturezaMap[natureza].quantidade++;
        }
      });

      return Object.values(naturezaMap);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Clientes por mês (últimos 6 meses)
  const { data: clientesPorMes, isLoading: isLoadingMes } = useQuery({
    queryKey: ["clientes-panel-mes"],
    queryFn: async () => {
      const meses: { mes: string; quantidade: number }[] = [];
      const hoje = new Date();

      for (let i = 5; i >= 0; i--) {
        const inicioMes = startOfMonth(subMonths(hoje, i));
        const fimMes = startOfMonth(subMonths(hoje, i - 1));

        const { count } = await supabase
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .gte("created_at", inicioMes.toISOString())
          .lt("created_at", fimMes.toISOString());

        meses.push({
          mes: format(inicioMes, "MMM"),
          quantidade: count || 0,
        });
      }

      return meses;
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Top estados
  const { data: clientesPorEstado, isLoading: isLoadingEstado } = useQuery({
    queryKey: ["clientes-panel-estado"],
    queryFn: async () => {
      const { data } = await supabase.from("cliente_enderecos").select("estado");
      
      const estadoMap: Record<string, number> = {};
      
      (data || []).forEach((endereco) => {
        const estado = endereco.estado || "Não informado";
        estadoMap[estado] = (estadoMap[estado] || 0) + 1;
      });

      return Object.entries(estadoMap)
        .map(([estado, quantidade]) => ({ estado, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = isLoadingKpis || isLoadingNatureza || isLoadingMes || isLoadingEstado;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernKPICard 
          title="Total Clientes" 
          value={clientesKpis?.totalClientes || 0} 
          trend={5.8} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#0ea5e9" 
        />
        <ModernKPICard 
          title="Novos Este Mês" 
          value={clientesKpis?.clientesNovosMes || 0} 
          trend={12.3} 
          subtitle="Cadastros recentes" 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#10b981" 
        />
        <ModernKPICard 
          title="Total Contatos" 
          value={clientesKpis?.totalContatos || 0} 
          trend={8.1} 
          subtitle="Base de contatos" 
        />
        <ModernKPICard 
          title="Limite de Crédito" 
          value={formatCurrency(clientesKpis?.limiteTotal || 0)} 
          trend={3.5} 
          subtitle="Total disponível" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clientes por Natureza */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes por Natureza
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clientesPorNatureza || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="quantidade" nameKey="natureza">
                      {(clientesPorNatureza || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {(clientesPorNatureza || []).map((item, index) => (
                  <div key={item.natureza} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.natureza}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evolução de Cadastros */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Novos Cadastros (6 meses)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clientesPorMes || []}>
                  <defs>
                    <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="quantidade" name="Novos Clientes" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorClientes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Estados e Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Estados */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top 5 Estados
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesPorEstado || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="estado" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Clientes" radius={[0, 4, 4, 0]}>
                    {(clientesPorEstado || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Métricas Adicionais */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border/30 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientesKpis?.clientesPJ || 0}</p>
                  <p className="text-sm text-muted-foreground">Pessoa Jurídica</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/30 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <UserCheck className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientesKpis?.clientesPF || 0}</p>
                  <p className="text-sm text-muted-foreground">Pessoa Física</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/30 shadow-sm col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientesKpis?.totalContatos || 0}</p>
                  <p className="text-sm text-muted-foreground">Contatos Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
