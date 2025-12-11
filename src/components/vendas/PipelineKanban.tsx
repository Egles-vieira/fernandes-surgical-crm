import { DropResult } from "@hello-pangea/dnd";
import { KanbanBoard } from "./pipeline/KanbanBoard";
import type { VendaPipelineCard } from "@/hooks/useVendasPipeline";

// Tipo para totais por etapa
interface TotaisEtapa {
  quantidade: number;
  quantidadeReal: number;
  valorTotal: number;
  valorPotencial: number;
}

export type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "fechamento" | "followup_cliente" | "ganho" | "perdido";

interface PipelineKanbanProps {
  vendas: VendaPipelineCard[];
  totaisPorEtapa?: Record<string, TotaisEtapa>;
  etapaCarregando?: string | null;
  onDragEnd: (result: DropResult) => void;
  onViewDetails: (venda: VendaPipelineCard) => void;
  onCarregarMais?: (etapa: EtapaPipeline) => void;
}

export function PipelineKanban({
  vendas,
  totaisPorEtapa,
  etapaCarregando,
  onDragEnd,
  onViewDetails,
  onCarregarMais
}: PipelineKanbanProps) {
  return (
    <div className="flex flex-col h-full">
      <KanbanBoard 
        vendas={vendas} 
        totaisPorEtapa={totaisPorEtapa}
        etapaCarregando={etapaCarregando}
        onDragEnd={onDragEnd} 
        onViewDetails={onViewDetails}
        onCarregarMais={onCarregarMais}
      />
    </div>
  );
}
