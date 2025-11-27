import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { KanbanColumn, EtapaPipeline } from "./KanbanColumn";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Venda = Tables["vendas"]["Row"];

interface VendaPipeline extends Venda {
  vendas_itens?: any[];
}

interface KanbanBoardProps {
  vendas: VendaPipeline[];
  onDragEnd: (result: DropResult) => void;
  onViewDetails: (venda: VendaPipeline) => void;
}

const ETAPAS_CONFIG: Record<EtapaPipeline, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  prospeccao: {
    label: "Prospecção",
    color: "hsl(var(--muted-foreground))",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-700 dark:text-slate-200",
  },
  qualificacao: {
    label: "Qualificação",
    color: "hsl(var(--primary))",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  proposta: {
    label: "Proposta",
    color: "hsl(var(--warning))",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-300",
  },
  negociacao: {
    label: "Negociação",
    color: "hsl(var(--secondary))",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
  },
  fechamento: {
    label: "Fechamento",
    color: "hsl(var(--success))",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
  },
  followup_cliente: {
    label: "Follow-up Cliente",
    color: "hsl(var(--primary))",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    textColor: "text-teal-700 dark:text-teal-300",
  },
  ganho: {
    label: "Ganho",
    color: "hsl(var(--success))",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-300",
  },
  perdido: {
    label: "Perdido",
    color: "hsl(var(--destructive))",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-300",
  },
};

const ETAPAS_ATIVAS: EtapaPipeline[] = [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "fechamento",
  "followup_cliente",
];

export function KanbanBoard({ vendas, onDragEnd, onViewDetails }: KanbanBoardProps) {
  const getVendasPorEtapa = (etapa: EtapaPipeline): VendaPipeline[] => {
    return vendas.filter((v) => v.etapa_pipeline === etapa);
  };

  const calcularValorTotal = (etapa: EtapaPipeline): number => {
    return getVendasPorEtapa(etapa).reduce((total, venda) => {
      // Usar valor_total se valor_estimado for 0 (mesma lógica do KanbanCard)
      const valorBase = (venda.valor_estimado || 0) > 0 ? venda.valor_estimado : (venda.valor_total || 0);
      const valorPotencial = (valorBase || 0) * ((venda.probabilidade || 0) / 100);
      return total + valorPotencial;
    }, 0);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="h-full overflow-hidden bg-muted/20">
        <ScrollArea className="h-full w-full">
          <div className="flex gap-3 p-4 min-w-max">
            {ETAPAS_ATIVAS.map((etapa) => (
              <KanbanColumn
                key={etapa}
                etapa={etapa}
                config={ETAPAS_CONFIG[etapa]}
                vendas={getVendasPorEtapa(etapa)}
                valorTotal={calcularValorTotal(etapa)}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </DragDropContext>
  );
}
