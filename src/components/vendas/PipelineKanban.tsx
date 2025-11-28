import { DropResult } from "@hello-pangea/dnd";
import { PipelineTotalHUD } from "./pipeline/PipelineTotalHUD";
import { KanbanBoard } from "./pipeline/KanbanBoard";
import type { Database } from "@/integrations/supabase/types";
type Tables = Database["public"]["Tables"];
type Venda = Tables["vendas"]["Row"];
interface VendaPipeline extends Venda {
  vendas_itens?: any[];
}
export type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "fechamento" | "followup_cliente" | "ganho" | "perdido";
interface PipelineKanbanProps {
  vendas: VendaPipeline[];
  onDragEnd: (result: DropResult) => void;
  onViewDetails: (venda: VendaPipeline) => void;
}
export function PipelineKanban({
  vendas,
  onDragEnd,
  onViewDetails
}: PipelineKanbanProps) {
  // Cálculo do valor total para o HUD
  const totalPipeline = vendas.reduce((total, venda) => {
    const valorPotencial = (venda.valor_estimado || 0) * ((venda.probabilidade || 0) / 100);
    return total + valorPotencial;
  }, 0);
  return <div className="flex flex-col h-full">
      
      <KanbanBoard vendas={vendas} onDragEnd={onDragEnd} onViewDetails={onViewDetails} />
    </div>;
}