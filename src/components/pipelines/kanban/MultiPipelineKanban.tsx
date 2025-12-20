import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineKanbanColumn } from "./PipelineKanbanColumn";
import { PipelineSelector } from "../forms/PipelineSelector";
import { OportunidadeFormDialog } from "../forms/OportunidadeFormDialog";
import { OportunidadeDetailsSheet } from "../details/OportunidadeDetailsSheet";
import { usePipelineComEstagios } from "@/hooks/pipelines/usePipelines";
import { useKanbanOportunidades, useMoverEstagio } from "@/hooks/pipelines/useOportunidades";
import { usePipelineFields } from "@/hooks/pipelines/usePipelineFields";
import { OportunidadeCard, EstagioPipeline } from "@/types/pipelines";
interface MultiPipelineKanbanProps {
  pipelineIdInicial?: string | null;
  onPipelineChange?: (pipelineId: string) => void;
  onOportunidadeClick?: (oportunidade: OportunidadeCard) => void;
  showNovaOportunidadeDialog?: boolean;
  onShowNovaOportunidadeDialogChange?: (show: boolean) => void;
}
export function MultiPipelineKanban({
  pipelineIdInicial,
  onPipelineChange,
  onOportunidadeClick,
  showNovaOportunidadeDialog,
  onShowNovaOportunidadeDialogChange
}: MultiPipelineKanbanProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pipelineId, setPipelineId] = useState<string | null>(pipelineIdInicial || null);

  // Controle via URL
  const selectedOportunidadeId = searchParams.get("oportunidade");
  const showNovaFromUrl = searchParams.get("nova") === "true";

  // Controle do dialog - usa props externas se fornecidas, senão URL
  const isDialogControlledExternally = showNovaOportunidadeDialog !== undefined;
  const showNovaOportunidade = isDialogControlledExternally ? showNovaOportunidadeDialog : showNovaFromUrl;
  const setShowNovaOportunidade = (show: boolean) => {
    if (isDialogControlledExternally && onShowNovaOportunidadeDialogChange) {
      onShowNovaOportunidadeDialogChange(show);
    } else {
      const newParams = new URLSearchParams(searchParams);
      if (show) {
        newParams.set("nova", "true");
        if (pipelineId) newParams.set("pipeline", pipelineId);
      } else {
        newParams.delete("nova");
        newParams.delete("pipeline");
      }
      setSearchParams(newParams);
    }
  };

  // Sincronizar estado interno quando a prop externa mudar
  useEffect(() => {
    if (pipelineIdInicial !== undefined) {
      setPipelineId(pipelineIdInicial);
    }
  }, [pipelineIdInicial]);

  // Buscar pipeline com estágios
  const {
    pipeline,
    estagios,
    isLoading: loadingPipeline
  } = usePipelineComEstagios(pipelineId);

  // Buscar oportunidades organizadas para o Kanban com paginação
  const {
    data: kanbanData,
    isLoading: loadingOportunidades,
    carregarMais,
    estagioCarregando
  } = useKanbanOportunidades(pipelineId);

  // Buscar campos visíveis no Kanban
  const {
    data: kanbanFields
  } = usePipelineFields({
    pipelineId: pipelineId || "",
    apenasVisivelKanban: true
  });

  // Mutation para mover estágio
  const moverEstagio = useMoverEstagio();
  const handlePipelineChange = (newPipelineId: string) => {
    setPipelineId(newPipelineId);
    onPipelineChange?.(newPipelineId);
  };
  const handleDragEnd = (result: DropResult) => {
    const {
      destination,
      source,
      draggableId
    } = result;

    // Ignorar se soltar fora ou na mesma posição
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Mover para novo estágio
    moverEstagio.mutate({
      oportunidadeId: draggableId,
      novoEstagioId: destination.droppableId
    });
  };
  const handleViewDetails = (oportunidade: OportunidadeCard) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("oportunidade", oportunidade.id);
    setSearchParams(newParams);
    onOportunidadeClick?.(oportunidade);
  };
  const handleCloseDetails = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("oportunidade");
    setSearchParams(newParams);
  };
  const handleOportunidadeCriada = (oportunidadeId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("nova");
    newParams.delete("pipeline");
    newParams.set("oportunidade", oportunidadeId);
    setSearchParams(newParams);
  };

  // Organizar dados das colunas - usar diretamente kanbanData que já vem estruturado
  const colunas = useMemo(() => {
    if (!kanbanData?.colunas?.length) {
      console.log("[MultiPipelineKanban] Sem colunas no kanbanData");
      return [];
    }

    // kanbanData.colunas já vem ordenado e com os estágios incluídos
    return kanbanData.colunas.map(coluna => ({
      estagio: {
        id: coluna.id,
        nome_estagio: coluna.nome,
        ordem_estagio: coluna.ordem,
        cor: coluna.cor,
        pipeline_id: pipelineId || "",
        percentual_probabilidade: coluna.probabilidade,
        eh_ganho_fechado: coluna.ehGanho,
        eh_perdido_fechado: coluna.ehPerdido,
        alerta_estagnacao_dias: coluna.alertaEstagnacaoDias
      } as EstagioPipeline,
      oportunidades: coluna.oportunidades || [],
      valorTotal: coluna.totalValor || 0,
      totalOportunidades: coluna.totalOportunidades || 0
    }));
  }, [kanbanData, pipelineId]);

  // Loading state
  if (!pipelineId) {
    return <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <h3 className="text-lg font-medium text-muted-foreground">
          Selecione um Pipeline
        </h3>
        <div className="w-72">
          <PipelineSelector value={pipelineId} onChange={handlePipelineChange} showLabel={false} placeholder="Escolha um pipeline..." />
        </div>
      </div>;
  }
  if (loadingPipeline || loadingOportunidades) {
    return <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }
  return <div className="flex flex-col h-full">
      {/* Header do Kanban */}
      <div className="flex items-center justify-between px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-[5px]">
        <div className="flex items-center gap-4">
          <div className="w-56">
            <PipelineSelector value={pipelineId} onChange={handlePipelineChange} showLabel={false} />
          </div>
          {pipeline && <div className="flex items-center gap-2">
              {pipeline.cor && <div className="w-3 h-3 rounded-full" style={{
            backgroundColor: pipeline.cor
          }} />}
              <span className="text-sm text-muted-foreground">
                {pipeline.descricao}
              </span>
            </div>}
        </div>

        {/* Botão só aparece se não controlado externamente */}
        {!isDialogControlledExternally && <div className="flex items-center gap-2">
            <Button onClick={() => setShowNovaOportunidade(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Oportunidade
            </Button>
          </div>}
      </div>

      {/* Área do Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/20">
          <ScrollArea className="h-full w-full">
            <div className="flex gap-3 p-4 min-w-max bg-[#dcdee0]">
              {colunas.map(({
              estagio,
              oportunidades,
              valorTotal,
              totalOportunidades
            }) => <PipelineKanbanColumn key={estagio.id} estagio={estagio} oportunidades={oportunidades} valorTotal={valorTotal} totalReal={totalOportunidades} pipelineId={pipelineId} onViewDetails={handleViewDetails} onCarregarMais={() => carregarMais(estagio.id)} isLoadingMore={estagioCarregando === estagio.id} />)}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </DragDropContext>

      {/* Sheet para nova oportunidade */}
      <OportunidadeFormDialog open={showNovaOportunidade} onOpenChange={setShowNovaOportunidade} pipelineId={pipelineId} variant="sheet" onSuccess={handleOportunidadeCriada} />

      {/* Sheet de detalhes da oportunidade */}
      <OportunidadeDetailsSheet open={!!selectedOportunidadeId} onOpenChange={open => !open && handleCloseDetails()} oportunidadeId={selectedOportunidadeId} pipelineId={pipelineId} />
    </div>;
}