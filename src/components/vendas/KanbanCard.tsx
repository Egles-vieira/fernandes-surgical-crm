import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";
import { VendaPipeline } from "./PipelineKanban";

interface KanbanCardProps {
  venda: VendaPipeline;
  onEdit: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ venda, onEdit, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: venda.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const valor = venda.valor_estimado || venda.valor_total;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-card"
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{venda.cliente_nome}</p>
            <p className="text-xs text-muted-foreground truncate">{venda.numero_venda}</p>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {venda.probabilidade}%
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-primary">
          <DollarSign size={14} />
          <span className="text-sm font-semibold">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 0,
            }).format(valor)}
          </span>
        </div>

        {venda.data_fechamento_prevista && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar size={12} />
            <span className="text-xs">
              {new Date(venda.data_fechamento_prevista).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {venda.probabilidade >= 75 ? "Alta" : venda.probabilidade >= 50 ? "Média" : "Baixa"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
