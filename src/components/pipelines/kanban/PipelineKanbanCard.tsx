import { Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OportunidadeCard } from "@/types/pipelines";
import { cn } from "@/lib/utils";

interface PipelineKanbanCardProps {
  oportunidade: OportunidadeCard;
  index: number;
  onClick: () => void;
}

export function PipelineKanbanCard({
  oportunidade,
  index,
  onClick,
}: PipelineKanbanCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Draggable draggableId={oportunidade.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md",
            "border border-border/50 bg-background",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/20",
            oportunidade.estaEstagnado && "border-l-4 border-l-amber-500"
          )}
        >
          {/* Header: Nome + Valor */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {oportunidade.nome}
              </h4>
              {oportunidade.codigo && (
                <span className="text-xs text-muted-foreground">
                  #{oportunidade.codigo}
                </span>
              )}
            </div>
            {oportunidade.valor && (
              <span className="text-sm font-semibold text-primary shrink-0">
                {formatCurrency(oportunidade.valor)}
              </span>
            )}
          </div>

          {/* Info: Conta, Contato, Data */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {oportunidade.conta && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{oportunidade.conta}</span>
              </div>
            )}
            {oportunidade.contato && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span className="truncate">{oportunidade.contato}</span>
              </div>
            )}
            {oportunidade.dataFechamento && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(oportunidade.dataFechamento)}</span>
              </div>
            )}
          </div>

          {/* Footer: Probabilidade + Dias no estágio */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              {oportunidade.probabilidade !== null && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {oportunidade.probabilidade}%
                </Badge>
              )}
              {oportunidade.estaEstagnado && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs">Estagnado</span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {oportunidade.diasNoEstagio}d
            </span>
          </div>

          {/* Campos customizados visíveis no Kanban */}
          {Object.keys(oportunidade.camposKanban).length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              {Object.entries(oportunidade.camposKanban).slice(0, 3).map(([key, value]) => (
                <div key={key} className="text-xs text-muted-foreground truncate">
                  <span className="capitalize">{key.replace(/_/g, ' ')}: </span>
                  <span className="font-medium text-foreground">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </Draggable>
  );
}
