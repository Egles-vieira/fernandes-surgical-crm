import { useState } from "react";
import { DashboardPaginator } from "@/components/dashboard/DashboardPaginator";
import { DashboardFiltersPanel } from "@/components/dashboard/DashboardFiltersPanel";

export default function Index() {
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activePanel, setActivePanel] = useState("resultado-geral");

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
      />

      {/* Conteúdo do Dashboard */}
      <div className="flex-1 overflow-auto p-6">
        <DashboardPaginator activeTab={activePanel} onTabChange={setActivePanel} />
      </div>
    </div>
  );
}
