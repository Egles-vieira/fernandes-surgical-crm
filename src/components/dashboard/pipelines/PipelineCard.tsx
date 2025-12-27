import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight } from "lucide-react";
import { formatCurrency } from "../shared/ChartComponents";
import type { MetricasPipeline } from "@/hooks/useDashboardPipelines";

interface PipelineCardProps {
  pipeline: MetricasPipeline;
  onClick?: () => void;
}

// Mapeamento de ícones do Lucide para componentes
const getIconComponent = (iconName: string | null) => {
  // Por padrão, retorna um indicador visual genérico
  return null;
};

export function PipelineCard({ pipeline, onClick }: PipelineCardProps) {
  const navigate = useNavigate();
  const corPipeline = pipeline.cor || "#6366f1";

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/vendas?pipeline=${pipeline.pipeline_id}`);
    }
  };

  return (
    <Card
      className="bg-card border-border/30 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden"
      onClick={handleClick}
    >
      {/* Barra colorida no topo */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: corPipeline }}
      />
      
      <CardContent className="p-4">
        {/* Header com nome e badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: corPipeline }}
            />
            <span className="font-semibold text-foreground text-sm truncate max-w-[140px]">
              {pipeline.nome}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Métricas principais */}
        <div className="space-y-2">
          {/* Oportunidades abertas */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Abertas</span>
            <Badge variant="secondary" className="text-xs font-semibold">
              {pipeline.abertas}
            </Badge>
          </div>

          {/* Valor em aberto */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Valor Aberto</span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(pipeline.valor_aberto)}
            </span>
          </div>

          {/* Valor ponderado */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ponderado</span>
            <span className="text-sm font-medium text-primary">
              {formatCurrency(pipeline.valor_ponderado)}
            </span>
          </div>
        </div>

        {/* Footer com taxa de conversão */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Conversão</span>
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: pipeline.taxa_conversao >= 50 ? "#22c55e" : pipeline.taxa_conversao >= 25 ? "#f59e0b" : "#ef4444" }}
          >
            {pipeline.taxa_conversao.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
