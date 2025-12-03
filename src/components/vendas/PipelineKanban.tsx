import { DropResult } from "@hello-pangea/dnd";
import { KanbanBoard } from "./pipeline/KanbanBoard";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Venda = Tables["vendas"]["Row"];

interface VendaPipeline extends Venda {
  vendas_itens?: any[];
  total_na_etapa?: number;
}

// Tipo para totais por etapa
interface TotaisEtapa {
  quantidade: number;
  quantidadeReal: number;
  valorTotal: number;
  valorPotencial: number;
}

export type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "fechamento" | "followup_cliente" | "ganho" | "perdido";

interface PipelineKanbanProps {
  vendas: VendaPipeline[];
  totaisPorEtapa?: Record<string, TotaisEtapa>;
  onDragEnd: (result: DropResult) => void;
  onViewDetails: (venda: VendaPipeline) => void;
  onVerTodos?: (etapa: EtapaPipeline) => void;
}

export function PipelineKanban({
  vendas,
  totaisPorEtapa,
  onDragEnd,
  onViewDetails,
  onVerTodos
}: PipelineKanbanProps) {
  return (
    <div className="flex flex-col h-full">
      <KanbanBoard 
        vendas={vendas} 
        totaisPorEtapa={totaisPorEtapa}
        onDragEnd={onDragEnd} 
        onViewDetails={onViewDetails}
        onVerTodos={onVerTodos}
      />
    </div>
  );
}
