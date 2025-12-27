import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardPaginator } from "@/components/dashboard/DashboardPaginator";
import { DashboardFiltersPanel } from "@/components/dashboard/DashboardFiltersPanel";

export default function Index() {
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activePanel, setActivePanel] = useState("resultado-geral");
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null);

  // Buscar pipelines para o filtro lateral
  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_metricas_por_pipeline")
        .select("pipeline_id, nome, cor")
        .order("ordem_exibicao", { ascending: true });

      if (error) {
        console.error("Erro ao buscar pipelines:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleFiltersChange = (filters: Record<string, any>) => {
    setActiveFilters(filters);
    console.log("Filtros aplicados:", filters);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Painel de Filtros Lateral */}
      <DashboardFiltersPanel 
        isCollapsed={isFilterCollapsed}
        onToggleCollapse={() => setIsFilterCollapsed(!isFilterCollapsed)}
        onFiltersChange={handleFiltersChange}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        pipelineFilter={pipelineFilter}
        onPipelineFilterChange={setPipelineFilter}
        pipelines={pipelines}
      />

      {/* Conteúdo do Dashboard */}
      <div className="flex-1 overflow-auto p-6">
        <DashboardPaginator 
          activeTab={activePanel} 
          onTabChange={setActivePanel}
          pipelineFilter={pipelineFilter}
          onPipelineFilterChange={setPipelineFilter}
        />
      </div>
    </div>
  );
}
