import { Building2, Calendar, TrendingUp, MoreVertical, Eye, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { VendaPipelineCard } from "@/hooks/useVendasPipeline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanCardProps {
  venda: VendaPipelineCard;
  index: number;
  onViewDetails: (venda: VendaPipelineCard) => void;
  onDuplicar?: (venda: VendaPipelineCard) => void;
}

export function KanbanCard({
  venda,
  index,
  onViewDetails,
  onDuplicar
}: KanbanCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short"
    });
  };
  const getProbabilidadeConfig = (prob: number) => {
    if (prob >= 80) return {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      barColor: "bg-emerald-500"
    };
    if (prob >= 50) return {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      barColor: "bg-amber-500"
    };
    if (prob >= 25) return {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      barColor: "bg-blue-500"
    };
    return {
      color: "text-muted-foreground",
      bg: "bg-muted/50 border-border",
      barColor: "bg-muted-foreground/50"
    };
  };
  const valorBase = venda.valor_estimado || 0;
  const valorPotencial = valorBase * ((venda.probabilidade || 0) / 100);
  const probConfig = getProbabilidadeConfig(venda.probabilidade || 0);
  return <Draggable draggableId={venda.id} index={index}>
      {(provided, snapshot) => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <Card className={cn("relative overflow-hidden mb-3 cursor-pointer transition-all duration-200", "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30", "bg-card/80 backdrop-blur-sm border-border/50", snapshot.isDragging && "shadow-xl ring-2 ring-primary/50 rotate-1 scale-[1.02]")} onClick={() => onViewDetails(venda)}>
            {/* Barra de progresso no topo */}
            <div className="h-1 w-full bg-muted/30">
              <div className={cn("h-full transition-all duration-500", probConfig.barColor)} style={{
            width: `${venda.probabilidade || 0}%`
          }} />
            </div>

            <div className="p-3.5">
              {/* Header com número, probabilidade e menu de ações */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-muted-foreground/70 tracking-wide">
                  #{venda.numero_venda.slice(-8)}
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5 border", probConfig.bg, probConfig.color)}>
                    {venda.probabilidade || 0}%
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50 bg-popover">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(venda); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicar?.(venda); }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar Proposta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Cliente */}
              <div className="flex items-start gap-2.5 mb-3">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight" title={venda.cliente_nome || ''}>
                    {venda.cliente_nome && venda.cliente_nome.length > 20 ? `${venda.cliente_nome.substring(0, 20)}...` : venda.cliente_nome || 'Sem cliente'}
                  </p>
                </div>
              </div>

              {/* Data prevista */}
              {venda.data_fechamento_prevista && <div className="flex items-center gap-1.5 mb-3">
                  <Calendar className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-[11px] text-muted-foreground">
                    Previsão: {formatDate(venda.data_fechamento_prevista)}
                  </span>
                </div>}

              {/* Valores */}
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" />
                    Valor
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {formatCurrency(valorBase)}
                  </span>
                </div>
                
              </div>
            </div>
          </Card>
        </div>}
    </Draggable>;
}