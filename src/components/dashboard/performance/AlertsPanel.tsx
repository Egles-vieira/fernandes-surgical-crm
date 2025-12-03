import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AlertTriangle, XCircle, Info, CheckCircle } from "lucide-react";

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
}

interface AlertsPanelProps {
  recommendations: string[];
  connectionUsage: number;
  avgQueryTime: number;
  errorRate: number;
  indexUsage: number;
  isLoading?: boolean;
}

export function AlertsPanel({ 
  recommendations, 
  connectionUsage, 
  avgQueryTime, 
  errorRate,
  indexUsage,
  isLoading 
}: AlertsPanelProps) {
  // Gerar alertas baseados nas métricas
  const alerts: Alert[] = [];

  // Alertas de conexão
  if (connectionUsage > 80) {
    alerts.push({
      id: 'conn-critical',
      severity: 'critical',
      title: 'Pool de Conexões Crítico',
      description: `${connectionUsage}% do pool em uso. Risco de timeout.`,
      timestamp: new Date()
    });
  } else if (connectionUsage > 60) {
    alerts.push({
      id: 'conn-warning',
      severity: 'warning',
      title: 'Pool de Conexões Alto',
      description: `${connectionUsage}% do pool em uso. Monitore a tendência.`,
      timestamp: new Date()
    });
  }

  // Alertas de performance de query
  if (avgQueryTime > 2000) {
    alerts.push({
      id: 'query-critical',
      severity: 'critical',
      title: 'Edge Functions Lentas',
      description: `Tempo médio ${avgQueryTime}ms. Otimize queries.`,
      timestamp: new Date()
    });
  } else if (avgQueryTime > 500) {
    alerts.push({
      id: 'query-warning',
      severity: 'warning',
      title: 'Edge Functions Moderadas',
      description: `Tempo médio ${avgQueryTime}ms. Considere otimização.`,
      timestamp: new Date()
    });
  }

  // Alertas de taxa de erro
  if (errorRate > 5) {
    alerts.push({
      id: 'error-critical',
      severity: 'critical',
      title: 'Taxa de Erro Alta',
      description: `${errorRate}% de erros. Verifique os logs.`,
      timestamp: new Date()
    });
  } else if (errorRate > 1) {
    alerts.push({
      id: 'error-warning',
      severity: 'warning',
      title: 'Taxa de Erro Elevada',
      description: `${errorRate}% de erros. Investigue a causa.`,
      timestamp: new Date()
    });
  }

  // Alertas de uso de índices
  if (indexUsage < 70) {
    alerts.push({
      id: 'index-critical',
      severity: 'critical',
      title: 'Baixo Uso de Índices',
      description: `Apenas ${indexUsage}% das queries usam índices.`,
      timestamp: new Date()
    });
  } else if (indexUsage < 90) {
    alerts.push({
      id: 'index-warning',
      severity: 'warning',
      title: 'Uso de Índices Subótimo',
      description: `${indexUsage}% das queries usam índices.`,
      timestamp: new Date()
    });
  }

  // Adicionar recomendações como alertas informativos
  recommendations.forEach((rec, index) => {
    alerts.push({
      id: `rec-${index}`,
      severity: 'info',
      title: 'Recomendação',
      description: rec,
      timestamp: new Date()
    });
  });

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info': return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-xs">Atenção</Badge>;
      case 'info': return <Badge variant="outline" className="text-xs">Info</Badge>;
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas e Recomendações
          </span>
          <div className="flex items-center gap-1">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">{criticalCount}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-xs">{warningCount}</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <CheckCircle className="h-12 w-12 text-success mb-2" />
            <p className="text-sm font-medium">Sistema Saudável</p>
            <p className="text-xs text-muted-foreground">Nenhum alerta no momento</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' ? 'bg-destructive/5 border-destructive/20' :
                    alert.severity === 'warning' ? 'bg-warning/5 border-warning/20' :
                    'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{alert.title}</span>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
