import { useState, useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PipelineKanbanColumn } from "./PipelineKanbanColumn";
import { PipelineSelector } from "../forms/PipelineSelector";
import { OportunidadeFormDialog } from "../forms/OportunidadeFormDialog";

import { usePipelineComEstagios } from "@/hooks/pipelines/usePipelines";
import { useKanbanOportunidades, useMoverEstagio } from "@/hooks/pipelines/useOportunidades";
import { usePipelineFields } from "@/hooks/pipelines/usePipelineFields";
import { OportunidadeCard, EstagioPipeline } from "@/types/pipelines";

interface MultiPipelineKanbanProps {
  pipelineIdInicial?: string | null;
  onPipelineChange?: (pipelineId: string) => void;
  onOportunidadeClick?: (oportunidade: OportunidadeCard) => void;
}

export function MultiPipelineKanban({
  pipelineIdInicial,
  onPipelineChange,
  onOportunidadeClick,
}: MultiPipelineKanbanProps) {
  const [pipelineId, setPipelineId] = useState<string | null>(pipelineIdInicial || null);
  const [showNovaOportunidade, setShowNovaOportunidade] = useState(false);

  // Buscar pipeline com estágios
  const { 
    pipeline,
    estagios, 
    isLoading: loadingPipeline 
  } = usePipelineComEstagios(pipelineId);

  // Buscar oportunidades organizadas para o Kanban
  const {
    data: kanbanData,
    isLoading: loadingOportunidades,
  } = useKanbanOportunidades(pipelineId);

  // Buscar campos visíveis no Kanban
  const { data: kanbanFields } = usePipelineFields({
    pipelineId: pipelineId || "",
    apenasVisivelKanban: true,
  });

  // Mutation para mover estágio
  const moverEstagio = useMoverEstagio();

  const handlePipelineChange = (newPipelineId: string) => {
    setPipelineId(newPipelineId);
    onPipelineChange?.(newPipelineId);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Ignorar se soltar fora ou na mesma posição
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Mover para novo estágio
    moverEstagio.mutate({
      oportunidadeId: draggableId,
      novoEstagioId: destination.droppableId,
    });
  };

  const handleViewDetails = (oportunidade: OportunidadeCard) => {
    onOportunidadeClick?.(oportunidade);
  };

  // Organizar dados das colunas - usar diretamente kanbanData que já vem estruturado
  const colunas = useMemo(() => {
    if (!kanbanData?.colunas?.length) {
      console.log("[MultiPipelineKanban] Sem colunas no kanbanData");
      return [];
    }

    // kanbanData.colunas já vem ordenado e com os estágios incluídos
    return kanbanData.colunas.map((coluna) => ({
      estagio: {
        id: coluna.id,
        nome_estagio: coluna.nome,
        ordem_estagio: coluna.ordem,
        cor: coluna.cor,
        pipeline_id: pipelineId || "",
        percentual_probabilidade: coluna.probabilidade,
        eh_ganho_fechado: coluna.ehGanho,
        eh_perdido_fechado: coluna.ehPerdido,
        alerta_estagnacao_dias: coluna.alertaEstagnacaoDias,
      } as EstagioPipeline,
      oportunidades: coluna.oportunidades || [],
      valorTotal: coluna.totalValor || 0,
      totalOportunidades: coluna.totalOportunidades || 0,
    }));
  }, [kanbanData, pipelineId]);

  // Loading state
  if (!pipelineId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <h3 className="text-lg font-medium text-muted-foreground">
          Selecione um Pipeline
        </h3>
        <div className="w-72">
          <PipelineSelector
            value={pipelineId}
            onChange={handlePipelineChange}
            showLabel={false}
            placeholder="Escolha um pipeline..."
          />
        </div>
      </div>
    );
  }

  if (loadingPipeline || loadingOportunidades) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header do Kanban */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <div className="w-56">
            <PipelineSelector
              value={pipelineId}
              onChange={handlePipelineChange}
              showLabel={false}
            />
          </div>
          {pipeline && (
            <div className="flex items-center gap-2">
              {pipeline.cor && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: pipeline.cor }}
                />
              )}
              <span className="text-sm text-muted-foreground">
                {pipeline.descricao}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNovaOportunidade(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Área do Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/20">
          <ScrollArea className="h-full w-full">
            <div className="flex gap-3 p-4 min-w-max">
              {colunas.map(({ estagio, oportunidades, valorTotal, totalOportunidades }) => (
                <PipelineKanbanColumn
                  key={estagio.id}
                  estagio={estagio}
                  oportunidades={oportunidades}
                  valorTotal={valorTotal}
                  totalReal={totalOportunidades}
                  pipelineId={pipelineId}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </DragDropContext>

      {/* Dialog para nova oportunidade */}
      <OportunidadeFormDialog
        open={showNovaOportunidade}
        onOpenChange={setShowNovaOportunidade}
        pipelineId={pipelineId}
      />
    </div>
  );
}
