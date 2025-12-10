import { Building2, User, MoreVertical, Eye, Edit, Copy, ArrowRight, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VendaPipelineCard } from "@/hooks/useVendasPipeline";

interface KanbanCardProps {
  venda: VendaPipelineCard;
  index: number;
  onViewDetails: (venda: VendaPipelineCard) => void;
  onMoverEtapa?: (id: string, etapa: string) => void;
}

const PROXIMAS_ETAPAS: Record<string, { etapa: string; label: string }> = {
  prospeccao: { etapa: "qualificacao", label: "Qualificação" },
  qualificacao: { etapa: "proposta", label: "Proposta" },
  proposta: { etapa: "negociacao", label: "Negociação" },
  negociacao: { etapa: "followup_cliente", label: "Follow-up" },
  followup_cliente: { etapa: "fechamento", label: "Fechamento" },
  fechamento: { etapa: "ganho", label: "Ganho" },
};

export function KanbanCard({ venda, index, onViewDetails, onMoverEtapa }: KanbanCardProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getProbabilidadeConfig = (prob: number) => {
    if (prob >= 80) return { 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-500/10",
      border: "border-l-emerald-500",
      badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    };
    if (prob >= 50) return { 
      color: "text-amber-600 dark:text-amber-400", 
      bg: "bg-amber-500/10",
      border: "border-l-amber-500",
      badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    };
    if (prob >= 25) return { 
      color: "text-blue-600 dark:text-blue-400", 
      bg: "bg-blue-500/10",
      border: "border-l-blue-500",
      badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
    };
    return { 
      color: "text-muted-foreground", 
      bg: "bg-muted/30",
      border: "border-l-muted-foreground/50",
      badgeBg: "bg-muted text-muted-foreground border-border"
    };
  };

  const valorBase = (venda.valor_estimado || 0) > 0 ? venda.valor_estimado : (venda.valor_total || 0);
  const probConfig = getProbabilidadeConfig(venda.probabilidade || 0);
  const proximaEtapa = PROXIMAS_ETAPAS[venda.etapa_pipeline];

  const handleCopiarNumero = () => {
    navigator.clipboard.writeText(venda.numero_venda);
    toast.success("Número copiado!");
  };

  const handleEditarProposta = () => {
    navigate(`/vendas/${venda.id}`);
  };

  const handleAvancarEtapa = () => {
    if (proximaEtapa && onMoverEtapa) {
      onMoverEtapa(venda.id, proximaEtapa.etapa);
    }
  };

  const CardActions = () => (
    <>
      <DropdownMenuItem onClick={() => onViewDetails(venda)}>
        <Eye className="h-4 w-4 mr-2" />
        Ver detalhes
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleEditarProposta}>
        <Edit className="h-4 w-4 mr-2" />
        Editar proposta
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleCopiarNumero}>
        <Copy className="h-4 w-4 mr-2" />
        Copiar número
      </DropdownMenuItem>
      {proximaEtapa && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAvancarEtapa}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Avançar para {proximaEtapa.label}
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return (
    <Draggable draggableId={venda.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <ContextMenu>
            <ContextMenuTrigger>
              <TooltipProvider delayDuration={500}>
                <Card
                  className={cn(
                    "relative overflow-hidden mb-2.5 cursor-pointer transition-all duration-200",
                    "hover:shadow-md hover:-translate-y-0.5",
                    "bg-card border-border/60",
                    "border-l-4",
                    probConfig.border,
                    snapshot.isDragging && "shadow-xl ring-2 ring-primary/40 rotate-1 scale-[1.02]"
                  )}
                  onClick={() => onViewDetails(venda)}
                >
                  <div className="p-3">
                    {/* Header: Número + Badge + Menu */}
                    <div className="flex items-center justify-between mb-2.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] font-mono text-muted-foreground/80 tracking-wide truncate max-w-[100px]">
                            #{venda.numero_venda.slice(-8)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">{venda.numero_venda}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0 h-5 border",
                            probConfig.badgeBg
                          )}
                        >
                          {venda.probabilidade || 0}%
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 hover:bg-muted/80"
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <CardActions />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="flex items-start gap-2 mb-2">
                      <div className="p-1 rounded bg-primary/10 shrink-0 mt-0.5">
                        <Building2 className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-[13px] font-medium text-foreground leading-tight truncate">
                              {venda.cliente_nome || "Cliente não informado"}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[250px]">
                            <p className="text-xs">{venda.cliente_nome}</p>
                            {venda.cliente_cnpj && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {venda.cliente_cnpj}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Vendedor */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1 rounded bg-secondary/50 shrink-0">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {venda.vendedor_nome || "Sem vendedor"}
                      </span>
                    </div>

                    {/* Data prevista (se existir) */}
                    {venda.data_fechamento_prevista && (
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground">
                          Previsão: {formatDate(venda.data_fechamento_prevista)}
                        </span>
                      </div>
                    )}

                    {/* Valor - Destaque */}
                    <div className={cn(
                      "pt-2.5 border-t border-border/50",
                      "flex items-center justify-between"
                    )}>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">
                        Valor
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(valorBase)}
                      </span>
                    </div>
                  </div>
                </Card>
              </TooltipProvider>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={() => onViewDetails(venda)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </ContextMenuItem>
              <ContextMenuItem onClick={handleEditarProposta}>
                <Edit className="h-4 w-4 mr-2" />
                Editar proposta
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleCopiarNumero}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar número
              </ContextMenuItem>
              {proximaEtapa && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={handleAvancarEtapa}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Avançar para {proximaEtapa.label}
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      )}
    </Draggable>
  );
}
