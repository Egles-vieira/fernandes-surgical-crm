import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Filter } from "lucide-react";
import { CustomTooltip, formatCurrency, CHART_COLORS } from "../shared/ChartComponents";
import type { MetricasEstagio } from "@/hooks/useDashboardPipelines";

interface PipelineFunnelChartProps {
  estagios: MetricasEstagio[];
  pipelineNome?: string;
}

export function PipelineFunnelChart({ estagios, pipelineNome }: PipelineFunnelChartProps) {
  // Preparar dados para o funil (barras horizontais)
  const chartData = estagios.map((e) => ({
    nome: e.nome_estagio,
    quantidade: e.total_oportunidades,
    valor: Number(e.valor_total) || 0,
    cor: e.cor,
    probabilidade: e.percentual_probabilidade,
  }));

  const title = pipelineNome
    ? `Funil: ${pipelineNome}`
    : "Funil de Oportunidades (Todos Pipelines)";

  return (
    <Card className="bg-card border-border/30 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Filter className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="nome"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Oportunidades: {data.quantidade}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Valor: {formatCurrency(data.valor)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prob: {data.probabilidade}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="quantidade" name="Oportunidades" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.cor || CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
