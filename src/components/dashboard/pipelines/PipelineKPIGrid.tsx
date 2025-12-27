import { ModernKPICard, formatCurrency, generateSparklineData } from "../shared/ChartComponents";
import type { PipelinesKPIs } from "@/hooks/useDashboardPipelines";

interface PipelineKPIGridProps {
  kpis: PipelinesKPIs | null;
  metaMensal?: number;
}

export function PipelineKPIGrid({ kpis, metaMensal = 1000000 }: PipelineKPIGridProps) {
  const valorAberto = kpis?.valor_em_aberto || 0;
  const progressoMeta = Math.min((valorAberto / metaMensal) * 100, 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <ModernKPICard
        title="Total Oportunidades"
        value={kpis?.total_oportunidades || 0}
        trend={12.5}
        sparklineData={generateSparklineData("up")}
        sparklineColor="#8b5cf6"
      />
      
      <ModernKPICard
        title="Em Aberto"
        value={kpis?.oportunidades_abertas || 0}
        subtitle={`${kpis?.total_pipelines || 0} pipelines ativos`}
        sparklineData={generateSparklineData("neutral")}
        sparklineColor="#0ea5e9"
      />
      
      <ModernKPICard
        title="Ganhas"
        value={kpis?.oportunidades_ganhas || 0}
        trend={8.3}
        sparklineData={generateSparklineData("up")}
        sparklineColor="#22c55e"
      />
      
      <ModernKPICard
        title="Valor em Aberto"
        value={formatCurrency(kpis?.valor_em_aberto || 0)}
        progress={progressoMeta}
        progressGoal={`Meta: ${formatCurrency(metaMensal)}`}
      />
      
      <ModernKPICard
        title="Valor Ponderado"
        value={formatCurrency(kpis?.valor_ponderado || 0)}
        subtitle="Baseado na probabilidade"
        sparklineData={generateSparklineData("up")}
        sparklineColor="#06b6d4"
      />
      
      <ModernKPICard
        title="Taxa de Conversão"
        value={`${kpis?.taxa_conversao?.toFixed(1) || 0}%`}
        trend={2.1}
        subtitle={`Ticket médio: ${formatCurrency(kpis?.ticket_medio || 0)}`}
      />
    </div>
  );
}
