import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, TrendingUp, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { formatCurrency, CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";

interface ProdutosPanelProps {
  isActive: boolean;
}

export function ProdutosPanel({ isActive }: ProdutosPanelProps) {
  // KPIs de Produtos
  const { data: produtosKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["produtos-panel-kpis"],
    queryFn: async () => {
      const { data, count } = await supabase
        .from("produtos")
        .select("id, quantidade_em_maos, preco_venda, embedding", { count: "exact" });

      const produtos = data || [];
      const totalProdutos = count || 0;
      const produtosAtivos = totalProdutos;
      const produtosComEstoque = produtos.filter(p => (p.quantidade_em_maos || 0) > 0).length;
      const produtosSemEstoque = produtos.filter(p => (p.quantidade_em_maos || 0) <= 0).length;
      const produtosComEmbedding = produtos.filter(p => p.embedding !== null).length;
      const valorEstoque = produtos.reduce((acc, p) => acc + ((p.quantidade_em_maos || 0) * (p.preco_venda || 0)), 0);

      return {
        totalProdutos,
        produtosAtivos,
        produtosComEstoque,
        produtosSemEstoque,
        produtosComEmbedding,
        valorEstoque,
        taxaEmbedding: totalProdutos > 0 ? Math.round((produtosComEmbedding / totalProdutos) * 100) : 0
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Status de estoque
  const { data: statusEstoque, isLoading: isLoadingEstoque } = useQuery({
    queryKey: ["produtos-panel-estoque"],
    queryFn: async () => {
      const { data } = await supabase.from("produtos").select("quantidade_em_maos");
      
      let semEstoque = 0;
      let estoqueBaixo = 0;
      let estoqueNormal = 0;
      let estoqueAlto = 0;

      (data || []).forEach((produto) => {
        const qtd = produto.quantidade_em_maos || 0;
        if (qtd <= 0) semEstoque++;
        else if (qtd < 10) estoqueBaixo++;
        else if (qtd < 100) estoqueNormal++;
        else estoqueAlto++;
      });

      return [
        { status: "Sem Estoque", quantidade: semEstoque },
        { status: "Baixo (<10)", quantidade: estoqueBaixo },
        { status: "Normal (10-100)", quantidade: estoqueNormal },
        { status: "Alto (>100)", quantidade: estoqueAlto },
      ];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = isLoadingKpis || isLoadingEstoque;

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
          title="Total Produtos" 
          value={produtosKpis?.totalProdutos || 0} 
          trend={3.5} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#8b5cf6" 
        />
        <ModernKPICard 
          title="Produtos Ativos" 
          value={produtosKpis?.produtosAtivos || 0} 
          trend={1.2} 
          subtitle="Disponíveis para venda" 
        />
        <ModernKPICard 
          title="Valor em Estoque" 
          value={formatCurrency(produtosKpis?.valorEstoque || 0)} 
          trend={5.8} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#10b981" 
        />
        <ModernKPICard 
          title="Taxa Embedding" 
          value={`${produtosKpis?.taxaEmbedding || 0}%`} 
          progress={produtosKpis?.taxaEmbedding || 0} 
          progressGoal="Meta: 100%" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status de Estoque - Pie Chart */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distribuição de Estoque
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusEstoque || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="quantidade" nameKey="status">
                      {(statusEstoque || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {(statusEstoque || []).map((item, index) => (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.status}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status de Estoque - Bar Chart */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Níveis de Estoque
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusEstoque || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {(statusEstoque || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{produtosKpis?.produtosComEstoque || 0}</p>
                <p className="text-sm text-muted-foreground">Com Estoque</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{produtosKpis?.produtosSemEstoque || 0}</p>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Database className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{produtosKpis?.produtosComEmbedding || 0}</p>
                <p className="text-sm text-muted-foreground">Com Embedding</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{produtosKpis?.produtosAtivos || 0}</p>
                <p className="text-sm text-muted-foreground">Catálogo Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
