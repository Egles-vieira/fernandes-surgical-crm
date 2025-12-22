import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { EstagioPipeline, OportunidadeCard } from "@/types/pipelines";
import { PipelineKanbanCard } from "./PipelineKanbanCard";
import { QuickOportunidadeForm } from "../forms/QuickOportunidadeForm";
import { cn } from "@/lib/utils";

interface PipelineKanbanColumnProps {
  estagio: EstagioPipeline;
  oportunidades: OportunidadeCard[];
  valorTotal: number;
  totalReal?: number;
  pipelineId: string;
  isLoadingMore?: boolean;
  onViewDetails: (oportunidade: OportunidadeCard) => void;
  onCarregarMais?: () => void;
  showQuickAdd?: boolean;
}

export function PipelineKanbanColumn({
  estagio,
  oportunidades,
  valorTotal,
  totalReal,
  pipelineId,
  isLoadingMore,
  onViewDetails,
  onCarregarMais,
  showQuickAdd = true,
}: PipelineKanbanColumnProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const quantidadeCarregada = oportunidades.length;
  const quantidadeTotal = totalReal || quantidadeCarregada;
  const temMais = quantidadeTotal > quantidadeCarregada;
  
  // Cores do estágio
  const estagioColor = estagio.cor || "hsl(var(--muted-foreground))";
  const isGanho = estagio.eh_ganho_fechado;
  const isPerdido = estagio.eh_perdido_fechado;

  return (
    <div 
      className={cn(
        "flex flex-col w-80 min-w-80 max-w-80 shrink-0 rounded-lg border overflow-hidden",
        "bg-card border-border/50",
        isGanho && "border-green-500/30 bg-green-50/30 dark:bg-green-950/20",
        isPerdido && "border-red-500/30 bg-red-50/30 dark:bg-red-950/20"
      )}
    >
      {/* Header da coluna */}
      <div 
        className="px-4 py-3 border-b border-border/50"
        style={{ borderTopColor: estagioColor, borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-foreground">
              {estagio.nome_estagio}
            </h3>
            {estagio.percentual_probabilidade !== null && (
              <span className="text-xs text-muted-foreground">
                {estagio.percentual_probabilidade}%
              </span>
            )}
          </div>
          <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {quantidadeCarregada}{temMais ? `/${quantidadeTotal}` : ''}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {formatCurrency(valorTotal)}
        </p>
      </div>

      {/* Área com scroll vertical interno */}
      <Droppable droppableId={estagio.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-hidden"
          >
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div
                className={cn(
                  "p-2 min-h-[200px] space-y-2",
                  snapshot.isDraggingOver && "bg-primary/5"
                )}
              >
                {/* Cards de oportunidade */}
                {oportunidades.map((oportunidade, index) => (
                  <PipelineKanbanCard
                    key={oportunidade.id}
                    oportunidade={oportunidade}
                    index={index}
                    onClick={() => onViewDetails(oportunidade)}
                  />
                ))}
                {provided.placeholder}

                {/* Form rápido para adicionar */}
                {showQuickAdd && !isGanho && !isPerdido && (
                  <div className="pt-2">
                    <QuickOportunidadeForm
                      pipelineId={pipelineId}
                      estagioId={estagio.id}
                    />
                  </div>
                )}

                {/* Botão para carregar mais */}
                {temMais && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onCarregarMais}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Ver mais ({quantidadeTotal - quantidadeCarregada})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </Droppable>
    </div>
  );
}
