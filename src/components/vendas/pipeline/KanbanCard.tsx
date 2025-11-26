import { Building2, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Draggable } from "@hello-pangea/dnd";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Venda = Tables["vendas"]["Row"];

interface VendaPipeline extends Venda {
  vendas_itens?: any[];
}

interface KanbanCardProps {
  venda: VendaPipeline;
  index: number;
  onViewDetails: (venda: VendaPipeline) => void;
}

export function KanbanCard({ venda, index, onViewDetails }: KanbanCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getProbabilidadeColor = (prob: number) => {
    if (prob >= 80) return "text-success";
    if (prob >= 50) return "text-warning";
    return "text-muted-foreground";
  };

  const valorPotencial = (venda.valor_estimado || 0) * ((venda.probabilidade || 0) / 100);

  return (
    <Draggable draggableId={venda.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card
            className={`p-3 mb-2 cursor-pointer hover:shadow-md transition-all ${
              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/50" : ""
            }`}
            onClick={() => onViewDetails(venda)}
          >
            {/* Header com número e probabilidade */}
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground">
                {venda.numero_venda}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${getProbabilidadeColor(venda.probabilidade || 0)}`}
              >
                {venda.probabilidade || 0}%
              </Badge>
            </div>

            {/* Cliente */}
            <div className="flex items-start gap-2 mb-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {venda.cliente_nome}
                </p>
                {venda.cliente_cnpj && (
                  <p className="text-xs text-muted-foreground truncate">
                    {venda.cliente_cnpj}
                  </p>
                )}
              </div>
            </div>

            {/* Data prevista */}
            {venda.data_fechamento_prevista && (
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(venda.data_fechamento_prevista)}</span>
              </div>
            )}

            {/* Valores */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Estimado
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(venda.valor_estimado || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Potencial
                </span>
                <span className="font-semibold text-primary">
                  {formatCurrency(valorPotencial)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
