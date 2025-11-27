import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanCard } from "./KanbanCard";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Venda = Tables["vendas"]["Row"];

interface VendaPipeline extends Venda {
  vendas_itens?: any[];
}

export type EtapaPipeline =
  | "prospeccao"
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "fechamento"
  | "ganho"
  | "perdido";

interface EtapaConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

interface KanbanColumnProps {
  etapa: EtapaPipeline;
  config: EtapaConfig;
  vendas: VendaPipeline[];
  valorTotal: number;
  onViewDetails: (venda: VendaPipeline) => void;
}

export function KanbanColumn({ etapa, config, vendas, valorTotal, onViewDetails }: KanbanColumnProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="flex flex-col w-80 shrink-0 bg-card border border-border/50 rounded-lg">
      {/* Header fixo da coluna */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm text-foreground">
            {config.label}
          </h3>
          <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {vendas.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(valorTotal)}
        </p>
      </div>

      {/* Área com scroll vertical interno */}
      <Droppable droppableId={etapa}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-hidden"
          >
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div
                className={`p-3 min-h-[200px] ${
                  snapshot.isDraggingOver ? "bg-primary/5" : ""
                }`}
              >
                {vendas.map((venda, index) => (
                  <KanbanCard
                    key={venda.id}
                    venda={venda}
                    index={index}
                    onViewDetails={onViewDetails}
                  />
                ))}
                {provided.placeholder}
              </div>
            </ScrollArea>
          </div>
        )}
      </Droppable>
    </div>
  );
}
