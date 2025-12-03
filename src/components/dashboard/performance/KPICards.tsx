import { Card, CardContent } from "@/components/ui/card";
import { Activity, Database, Zap, AlertTriangle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "./InfoTooltip";

interface KPICardsProps {
  healthScore: number;
  totalConnections: number;
  avgQueryTime: number;
  errorRate: number;
  indexUsage: number;
  isLoading?: boolean;
}

export function KPICards({ 
  healthScore, 
  totalConnections, 
  avgQueryTime, 
  errorRate,
  indexUsage,
  isLoading 
}: KPICardsProps) {
  const kpis = [
    {
      title: "Health Score",
      value: `${healthScore}`,
      suffix: "/100",
      icon: Activity,
      color: healthScore >= 80 ? "text-success" : healthScore >= 50 ? "text-warning" : "text-destructive",
      bgColor: healthScore >= 80 ? "bg-success/10" : healthScore >= 50 ? "bg-warning/10" : "bg-destructive/10",
      tooltip: "Score geral de saúde do sistema (0-100). Calculado com base em conexões, uso de índices e taxa de erros. Verde (80+) = Saudável, Amarelo (50-79) = Atenção, Vermelho (<50) = Crítico."
    },
    {
      title: "Conexões",
      value: `${totalConnections}`,
      suffix: "/300",
      icon: Users,
      color: totalConnections < 150 ? "text-success" : totalConnections < 240 ? "text-warning" : "text-destructive",
      bgColor: totalConnections < 150 ? "bg-success/10" : totalConnections < 240 ? "bg-warning/10" : "bg-destructive/10",
      tooltip: "Número de conexões ativas no banco de dados. Limite máximo: 300. Acima de 80% (240) indica risco de timeout e degradação de performance."
    },
    {
      title: "Edge Fn Avg",
      value: `${avgQueryTime}`,
      suffix: "ms",
      icon: Zap,
      color: avgQueryTime < 500 ? "text-success" : avgQueryTime < 2000 ? "text-warning" : "text-destructive",
      bgColor: avgQueryTime < 500 ? "bg-success/10" : avgQueryTime < 2000 ? "bg-warning/10" : "bg-destructive/10",
      tooltip: "Tempo médio de execução das Edge Functions nas últimas 24h. Ideal: <500ms (verde), Aceitável: <2000ms (amarelo), Crítico: >2000ms (vermelho)."
    },
    {
      title: "Taxa de Erro",
      value: `${errorRate}`,
      suffix: "%",
      icon: AlertTriangle,
      color: errorRate < 1 ? "text-success" : errorRate < 5 ? "text-warning" : "text-destructive",
      bgColor: errorRate < 1 ? "bg-success/10" : errorRate < 5 ? "bg-warning/10" : "bg-destructive/10",
      tooltip: "Porcentagem de requisições que resultaram em erro (status >= 400). Ideal: <1%, Atenção: 1-5%, Crítico: >5%."
    },
    {
      title: "Uso de Índices",
      value: `${indexUsage}`,
      suffix: "%",
      icon: Database,
      color: indexUsage >= 90 ? "text-success" : indexUsage >= 70 ? "text-warning" : "text-destructive",
      bgColor: indexUsage >= 90 ? "bg-success/10" : indexUsage >= 70 ? "bg-warning/10" : "bg-destructive/10",
      tooltip: "Porcentagem de consultas que utilizam índices do banco. Ideal: >90%. Baixo uso indica queries lentas fazendo full table scans (varreduras sequenciais)."
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className={`${kpi.bgColor} border-none`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">{kpi.title}</span>
                <InfoTooltip content={kpi.tooltip} />
              </div>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
              <span className="text-xs text-muted-foreground">{kpi.suffix}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
