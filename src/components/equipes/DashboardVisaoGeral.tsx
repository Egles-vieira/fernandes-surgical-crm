import { useDashboardMetas } from "@/hooks/useDashboardMetas";
import { useEquipesFiltros } from "@/contexts/EquipesFiltrosContext";
import { KPICard } from "./KPICard";
import { MetaAgregadaCard } from "./MetaAgregadaCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Users, Activity, Percent } from "lucide-react";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  Pie, 
  PieChart, 
  Cell,
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const ETAPAS_COLORS: Record<string, string> = {
  prospeccao: "hsl(var(--chart-1))",
  qualificacao: "hsl(var(--chart-2))",
  proposta: "hsl(var(--chart-3))",
  negociacao: "hsl(var(--chart-4))",
  fechamento: "hsl(var(--chart-5))",
  ganho: "hsl(142, 71%, 45%)",
  perdido: "hsl(0, 84%, 60%)",
};

export function DashboardVisaoGeral() {
  const { filtros } = useEquipesFiltros();
  const { kpis, pacing, funil, distribuicao, isLoading } = useDashboardMetas({
    dataInicio: filtros.dataInicio,
    dataFim: filtros.dataFim,
    equipeId: filtros.equipeId,
    vendedorId: filtros.vendedorId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Meta do Período"
          value={formatCurrency(kpis?.total_meta || 0)}
          icon={Target}
        />
        <KPICard
          title="Realizado"
          value={formatCurrency(kpis?.total_realizado || 0)}
          subtitle={`${formatPercent(kpis?.percentual_atingimento || 0)} da meta`}
          icon={TrendingUp}
          trend={
            (kpis?.percentual_atingimento || 0) >= 100
              ? "up"
              : (kpis?.percentual_atingimento || 0) >= 80
              ? "neutral"
              : "down"
          }
        />
        <KPICard
          title="Atingimento"
          value={formatPercent(kpis?.percentual_atingimento || 0)}
          icon={Percent}
          trend={
            (kpis?.percentual_atingimento || 0) >= 100
              ? "up"
              : (kpis?.percentual_atingimento || 0) >= 80
              ? "neutral"
              : "down"
          }
        />
        <KPICard
          title="Pacing"
          value={formatPercent(kpis?.pacing || 0)}
          subtitle="Ritmo vs. Tempo"
          icon={Activity}
          trend={
            (kpis?.pacing || 0) >= 100 ? "up" : (kpis?.pacing || 0) >= 90 ? "neutral" : "down"
          }
        />
        <KPICard
          title="Equipes Ativas"
          value={kpis?.numero_equipes || 0}
          icon={Users}
        />
      </div>

      {/* Meta Agregada - Mostrar quando houver equipe selecionada */}
      {filtros.equipeId && (
        <div className="grid gap-4">
          <MetaAgregadaCard equipeId={filtros.equipeId} />
        </div>
      )}

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Pacing Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Pacing Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                realizado: {
                  label: "Realizado",
                  color: "hsl(var(--chart-1))",
                },
                meta: {
                  label: "Meta",
                  color: "hsl(var(--chart-2))",
                },
                projecao: {
                  label: "Projeção",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pacing || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="semana" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => formatCurrency(value)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="realizado"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="meta"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="projecao"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Distribuição por Equipe */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Metas por Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                valor: {
                  label: "Valor",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicao || []}
                    dataKey="valor_objetivo"
                    nameKey="equipe_nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.equipe_nome}: ${formatPercent(entry.percentual)}`}
                  >
                    {(distribuicao || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Funil de Vendas */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Funil de Vendas por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                quantidade: {
                  label: "Quantidade",
                  color: "hsl(var(--chart-1))",
                },
                valor_total: {
                  label: "Valor Total",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funil || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="etapa" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="quantidade" name="Quantidade">
                    {(funil || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ETAPAS_COLORS[entry.etapa] || "hsl(var(--chart-1))"} />
                    ))}
                  </Bar>
                  <Bar dataKey="valor_total" name="Valor Total (R$)" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
