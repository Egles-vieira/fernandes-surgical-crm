import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";
import { CustomTooltip, formatCurrency, CHART_COLORS } from "../shared/ChartComponents";
import type { MetricasPipeline } from "@/hooks/useDashboardPipelines";

interface PipelineDistributionChartProps {
  pipelines: MetricasPipeline[];
  metric?: "abertas" | "valor_aberto" | "valor_ponderado";
}

export function PipelineDistributionChart({ 
  pipelines, 
  metric = "valor_aberto" 
}: PipelineDistributionChartProps) {
  // Preparar dados para o PieChart
  const chartData = pipelines
    .filter(p => p[metric] > 0)
    .map((p) => ({
      name: p.nome,
      value: Number(p[metric]) || 0,
      cor: p.cor,
    }));

  const total = chartData.reduce((acc, item) => acc + item.value, 0);

  const metricLabel = {
    abertas: "Oportunidades",
    valor_aberto: "Valor em Aberto",
    valor_ponderado: "Valor Ponderado",
  }[metric];

  return (
    <Card className="bg-card border-border/30 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Distribuição: {metricLabel}
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.cor || CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 max-h-44 overflow-y-auto">
            {chartData.map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.cor || CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {metric === "abertas" ? item.value : formatCurrency(item.value)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
