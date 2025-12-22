import { Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar, AlertTriangle, DollarSign } from "lucide-react";
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
  onClick
}: PipelineKanbanCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yy", {
        locale: ptBR
      });
    } catch {
      return dateStr;
    }
  };

  // Formatar valor de campo customizado baseado no tipo inferido
  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number") {
      // Verifica se parece ser moeda (valores altos)
      if (value > 100) {
        return new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
      }
      return String(value);
    }
    if (typeof value === "string") {
      // Tenta detectar data ISO
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        try {
          return format(parseISO(value), "dd/MM/yy", {
            locale: ptBR
          });
        } catch {
          return value;
        }
      }
      return value;
    }
    return String(value);
  };

  // Barra de progresso baseada na probabilidade
  const probabilidade = oportunidade.probabilidade || 0;
  const progressColor = probabilidade >= 70 ? "bg-green-500" : probabilidade >= 40 ? "bg-amber-500" : "bg-red-500";
  return <Draggable draggableId={oportunidade.id} index={index}>
      {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={onClick} className={cn("cursor-pointer transition-all hover:shadow-md overflow-hidden", "border border-border/50 bg-background", snapshot.isDragging && "shadow-lg ring-2 ring-primary/20", oportunidade.estaEstagnado && "border-l-4 border-l-amber-500")}>
          {/* Barra de probabilidade no topo */}
          <div className="h-1 w-full bg-muted">
            <div className={cn("h-full transition-all", progressColor)} style={{
          width: `${probabilidade}%`
        }} />
          </div>

          <div className="p-3 bg-secondary-foreground">
            {/* Header: Nome + Valor */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0 overflow-hidden">
                <h4 className="font-medium text-sm text-foreground truncate" title={oportunidade.nome}>
                  {oportunidade.nome}
                </h4>
                {oportunidade.codigo && <span className="text-xs text-muted-foreground block truncate" title={`#${oportunidade.codigo}`}>
                    #{oportunidade.codigo}
                  </span>}
              </div>
            </div>

            {/* Valor em destaque */}
            {oportunidade.valor != null && oportunidade.valor > 0 && <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded bg-primary/10">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(oportunidade.valor)}
                </span>
                {oportunidade.valorPonderado != null && <span className="text-xs text-muted-foreground ml-auto">
                    Pond: {formatCurrency(oportunidade.valorPonderado)}
                  </span>}
              </div>}

            {/* Info: Conta, Contato, Data */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {oportunidade.conta && <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{oportunidade.conta}</span>
                </div>}
              {oportunidade.contato && <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{oportunidade.contato}</span>
                </div>}
              {oportunidade.dataFechamento && <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{formatDate(oportunidade.dataFechamento)}</span>
                </div>}
            </div>

            {/* Footer: Probabilidade + Dias no estágio */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                {probabilidade > 0 && <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {probabilidade}%
                  </Badge>}
                {oportunidade.estaEstagnado && <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs">Estagnado</span>
                  </div>}
              </div>
              <span className="text-xs text-muted-foreground">
                {oportunidade.diasNoEstagio}d
              </span>
            </div>

            {/* Campos customizados visíveis no Kanban */}
            {Object.keys(oportunidade.camposKanban).length > 0 && <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                {Object.entries(oportunidade.camposKanban).slice(0, 3).map(([key, value]) => <div key={key} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground capitalize truncate">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium text-foreground truncate max-w-[120px]">
                      {formatFieldValue(value)}
                    </span>
                  </div>)}
              </div>}
          </div>
        </Card>}
    </Draggable>;
}