import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { CustomTooltip, CHART_COLORS } from "../shared/ChartComponents";
import type { EvolucaoMensal, MetricasPipeline } from "@/hooks/useDashboardPipelines";

interface PipelineEvolutionChartProps {
  evolucaoData: EvolucaoMensal[];
  pipelines: MetricasPipeline[];
  pipelineFilter?: string | null;
}

export function PipelineEvolutionChart({ evolucaoData, pipelines, pipelineFilter }: PipelineEvolutionChartProps) {
  // Preparar dados para o gráfico
  const chartData = evolucaoData.reduce<Record<string, any>>((acc, item) => {
    if (!acc[item.mes]) {
      acc[item.mes] = {
        mes: item.mes_abrev,
        ordem_mes: item.ordem_mes,
      };
    }
    // Adicionar valor por pipeline
    acc[item.mes][item.pipeline_nome] = Number(item.valor_criado) || 0;
    return acc;
  }, {});

  const formattedData = Object.values(chartData).sort((a: any, b: any) => a.ordem_mes - b.ordem_mes);

  // Pegar pipelines únicos para as séries
  const pipelinesUnicos = pipelineFilter
    ? pipelines.filter(p => p.pipeline_id === pipelineFilter)
    : pipelines;

  return (
    <Card className="bg-card border-border/30 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Evolução Mensal por Pipeline
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <defs>
                {pipelinesUnicos.map((pipeline, index) => (
                  <linearGradient
                    key={pipeline.pipeline_id}
                    id={`color-${pipeline.pipeline_id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={pipeline.cor || CHART_COLORS[index % CHART_COLORS.length]}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={pipeline.cor || CHART_COLORS[index % CHART_COLORS.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="mes"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconType="circle"
                iconSize={8}
              />
              {pipelinesUnicos.map((pipeline, index) => (
                <Area
                  key={pipeline.pipeline_id}
                  type="monotone"
                  dataKey={pipeline.nome}
                  name={pipeline.nome}
                  stroke={pipeline.cor || CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#color-${pipeline.pipeline_id})`}
                  stackId="1"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
