import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useDashboardPipelines } from "@/hooks/useDashboardPipelines";
import {
  PipelineCard,
  PipelineKPIGrid,
  PipelineEvolutionChart,
  PipelineDistributionChart,
  PipelineFunnelChart,
  PipelineStagesTable,
} from "../pipelines";

interface VendasPanelProps {
  isActive: boolean;
}

export function VendasPanel({ isActive }: VendasPanelProps) {
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    kpis,
    pipelines,
    estagios,
    evolucao,
    isLoading,
    refreshMVs,
  } = useDashboardPipelines({
    enabled: isActive,
    pipelineFilter,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const success = await refreshMVs();
    setIsRefreshing(false);
    if (success) {
      toast.success("Dados atualizados com sucesso!");
    } else {
      toast.error("Erro ao atualizar dados");
    }
  };

  const selectedPipeline = pipelines.find(p => p.pipeline_id === pipelineFilter);
  const filteredEstagios = pipelineFilter
    ? estagios.filter(e => e.pipeline_id === pipelineFilter)
    : estagios;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
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
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={pipelineFilter || "all"}
            onValueChange={(value) => setPipelineFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os Pipelines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Pipelines</SelectItem>
              {pipelines.map((p) => (
                <SelectItem key={p.pipeline_id} value={p.pipeline_id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.cor || "#6366f1" }}
                    />
                    {p.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Atualizar Dados
        </Button>
      </div>

      {/* KPI Cards Globais */}
      <PipelineKPIGrid kpis={kpis} metaMensal={2000000} />

      {/* Cards de Pipelines */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {pipelines.map((pipeline) => (
          <PipelineCard
            key={pipeline.pipeline_id}
            pipeline={pipeline}
            onClick={() => setPipelineFilter(
              pipelineFilter === pipeline.pipeline_id ? null : pipeline.pipeline_id
            )}
          />
        ))}
      </div>

      {/* Gráficos Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineEvolutionChart
          evolucaoData={evolucao}
          pipelines={pipelines}
          pipelineFilter={pipelineFilter}
        />
        <PipelineDistributionChart
          pipelines={pipelines}
          metric="valor_aberto"
        />
      </div>

      {/* Gráficos Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineFunnelChart
          estagios={filteredEstagios}
          pipelineNome={selectedPipeline?.nome}
        />
        <PipelineDistributionChart
          pipelines={pipelines}
          metric="valor_ponderado"
        />
      </div>

      {/* Tabela de Estágios */}
      <PipelineStagesTable estagios={estagios} pipelines={pipelines} />
    </div>
  );
}
