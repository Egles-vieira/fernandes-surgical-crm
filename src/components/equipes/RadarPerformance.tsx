import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";
import { PerformanceVendedor } from "@/hooks/usePerformanceVendedores";
import { ChartContainer } from "@/components/ui/chart";

interface RadarPerformanceProps {
  vendedores: PerformanceVendedor[];
  topN?: number;
}

export function RadarPerformance({ vendedores, topN = 5 }: RadarPerformanceProps) {
  const topVendedores = vendedores.slice(0, topN);

  // Normalizar os valores para escala 0-100
  const normalizar = (valor: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((valor / max) * 100, 100);
  };

  const maxValores = {
    atingimento: Math.max(...topVendedores.map((v) => v.percentual_atingimento), 100),
    conversao: Math.max(...topVendedores.map((v) => v.taxa_conversao), 100),
    margem: Math.max(...topVendedores.map((v) => v.margem_media), 100),
    ticket: Math.max(...topVendedores.map((v) => v.ticket_medio)),
    vendas: Math.max(...topVendedores.map((v) => v.total_vendas)),
  };

  const radarData = [
    {
      metrica: "Atingimento",
      ...Object.fromEntries(
        topVendedores.map((v) => [
          v.nome_vendedor,
          normalizar(v.percentual_atingimento, maxValores.atingimento),
        ])
      ),
    },
    {
      metrica: "Conversão",
      ...Object.fromEntries(
        topVendedores.map((v) => [v.nome_vendedor, normalizar(v.taxa_conversao, maxValores.conversao)])
      ),
    },
    {
      metrica: "Margem",
      ...Object.fromEntries(
        topVendedores.map((v) => [v.nome_vendedor, normalizar(v.margem_media, maxValores.margem)])
      ),
    },
    {
      metrica: "Ticket Médio",
      ...Object.fromEntries(
        topVendedores.map((v) => [v.nome_vendedor, normalizar(v.ticket_medio, maxValores.ticket)])
      ),
    },
    {
      metrica: "N° Vendas",
      ...Object.fromEntries(
        topVendedores.map((v) => [v.nome_vendedor, normalizar(v.total_vendas, maxValores.vendas)])
      ),
    },
  ];

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de Performance - Top {topN}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={Object.fromEntries(
            topVendedores.map((v, idx) => [
              v.nome_vendedor,
              {
                label: v.nome_vendedor,
                color: colors[idx % colors.length],
              },
            ])
          )}
          className="h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="metrica" className="text-xs" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
              {topVendedores.map((vendedor, idx) => (
                <Radar
                  key={vendedor.vendedor_id}
                  name={vendedor.nome_vendedor}
                  dataKey={vendedor.nome_vendedor}
                  stroke={colors[idx % colors.length]}
                  fill={colors[idx % colors.length]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
