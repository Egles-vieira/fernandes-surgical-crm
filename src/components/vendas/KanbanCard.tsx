import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, DollarSign, TrendingUp, User } from "lucide-react";
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
  const iniciais = venda.cliente_nome
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getProbabilidadeColor = (prob: number) => {
    if (prob >= 75) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (prob >= 50) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all bg-card border-border/50"
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      <div className="space-y-3">
        {/* Header com Avatar e Nome */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold text-xs">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{venda.cliente_nome}</p>
            <p className="text-xs text-primary truncate">{venda.numero_venda}</p>
          </div>
        </div>

        {/* Valor */}
        <div className="flex items-center gap-1.5 py-2">
          <span className="text-lg font-bold text-foreground">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 0,
            }).format(valor)}
          </span>
        </div>

        {/* Tags e Informações */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`text-xs rounded-full px-2 py-0.5 ${getProbabilidadeColor(venda.probabilidade)}`}>
            {venda.probabilidade >= 75 ? "Alta chance" : venda.probabilidade >= 50 ? "Médio" : "Baixo"}
          </Badge>
          
          {venda.data_fechamento_prevista && (
            <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
              <Calendar size={10} className="mr-1" />
              {new Date(venda.data_fechamento_prevista).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </Badge>
          )}
        </div>

        {/* Footer com Probabilidade */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {venda.probabilidade}% de chance
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
