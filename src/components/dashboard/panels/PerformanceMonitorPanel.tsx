import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Clock, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSystemMetrics } from "@/hooks/useSystemMetrics";
import { useEdgeFunctionMetrics } from "@/hooks/useEdgeFunctionMetrics";
import { useDatabaseHealth } from "@/hooks/useDatabaseHealth";
import {
  HealthScoreGauge,
  TableMetricsTable,
  ConnectionsChart,
  EdgeFunctionsPerformance,
  AlertsPanel,
  KPICards
} from "../performance";
import { toast } from "sonner";

interface PerformanceMonitorPanelProps {
  isActive?: boolean;
}

export function PerformanceMonitorPanel({ isActive = true }: PerformanceMonitorPanelProps) {
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: systemMetrics, isLoading: loadingSystem, refetch: refetchSystem } = useSystemMetrics(isActive, refreshInterval);
  const { data: edgeMetrics, isLoading: loadingEdge, refetch: refetchEdge } = useEdgeFunctionMetrics(isActive, refreshInterval);
  const { data: healthData, isLoading: loadingHealth, refetch: refetchHealth } = useDatabaseHealth(isActive, refreshInterval);

  const isLoading = loadingSystem || loadingEdge || loadingHealth;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidar todas as queries de performance para forçar refetch
      await queryClient.invalidateQueries({ queryKey: ["system-metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["edge-function-metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["database-health"] });
      
      // Também refetch direto para garantir
      await Promise.all([
        refetchSystem(),
        refetchEdge(),
        refetchHealth()
      ]);
      
      setLastRefresh(new Date());
      toast.success("Dados atualizados com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      health: healthData,
      system: systemMetrics,
      edgeFunctions: edgeMetrics
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calcular métricas agregadas
  const indexUsage = systemMetrics?.tables?.length 
    ? Math.round(systemMetrics.tables.reduce((sum, t) => sum + t.index_ratio, 0) / systemMetrics.tables.length)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Monitoramento de Performance</h2>
          <p className="text-sm text-muted-foreground">
            Métricas em tempo real do sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}</span>
          </div>
          <Select
            value={refreshInterval.toString()}
            onValueChange={(v) => setRefreshInterval(Number(v))}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15000">15 segundos</SelectItem>
              <SelectItem value="30000">30 segundos</SelectItem>
              <SelectItem value="60000">1 minuto</SelectItem>
              <SelectItem value="300000">5 minutos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button variant="default" size="sm" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards
        healthScore={healthData?.overallScore || 0}
        totalConnections={systemMetrics?.totalConnections || 0}
        avgQueryTime={edgeMetrics?.avgExecutionTime || 0}
        errorRate={edgeMetrics?.errorRate || 0}
        indexUsage={indexUsage}
        isLoading={isLoading}
      />

      {/* Row 1: Health Gauge + Connections Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreGauge
          score={healthData?.overallScore || 0}
          status={healthData?.overallStatus || 'healthy'}
          categories={healthData?.categories || []}
          isLoading={loadingHealth}
        />
        <ConnectionsChart
          totalConnections={systemMetrics?.totalConnections || 0}
          activeConnections={systemMetrics?.activeConnections || 0}
          idleConnections={systemMetrics?.idleConnections || 0}
          isLoading={loadingSystem}
        />
      </div>

      {/* Row 2: Table Metrics */}
      <TableMetricsTable
        tables={systemMetrics?.tables || []}
        isLoading={loadingSystem}
      />

      {/* Row 3: Edge Functions + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EdgeFunctionsPerformance
          functions={edgeMetrics?.functions || []}
          totalCalls={edgeMetrics?.totalCalls || 0}
          avgExecutionTime={edgeMetrics?.avgExecutionTime || 0}
          errorRate={edgeMetrics?.errorRate || 0}
          isLoading={loadingEdge}
        />
        <AlertsPanel
          recommendations={healthData?.recommendations || []}
          connectionUsage={Math.round((systemMetrics?.totalConnections || 0) / 300 * 100)}
          avgQueryTime={edgeMetrics?.avgExecutionTime || 0}
          errorRate={edgeMetrics?.errorRate || 0}
          indexUsage={indexUsage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
