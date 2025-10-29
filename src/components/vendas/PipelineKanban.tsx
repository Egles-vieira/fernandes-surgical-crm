import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Users, DollarSign } from "lucide-react";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";
export type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "fechamento" | "ganho" | "perdido";
export interface VendaPipeline {
  id: string;
  numero_venda: string;
  cliente_nome: string;
  valor_estimado: number;
  valor_total: number;
  probabilidade: number;
  etapa_pipeline: EtapaPipeline;
  data_fechamento_prevista?: string | null;
  responsavel_id?: string | null;
}
interface PipelineKanbanProps {
  vendas: VendaPipeline[];
  onMoverCard: (vendaId: string, novaEtapa: EtapaPipeline) => void;
  onEditarVenda: (venda: VendaPipeline) => void;
  onNovaVenda: () => void;
}
const ETAPAS_CONFIG: Record<EtapaPipeline, {
  label: string;
  color: string;
  icon: any;
}> = {
  prospeccao: {
    label: "Leads de Entrada",
    color: "bg-gradient-to-r from-amber-400 to-amber-500",
    icon: Users
  },
  qualificacao: {
    label: "Contato Inicial",
    color: "bg-gradient-to-r from-purple-400 to-purple-500",
    icon: TrendingUp
  },
  proposta: {
    label: "Proposta Enviada",
    color: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    icon: DollarSign
  },
  negociacao: {
    label: "Negociação",
    color: "bg-gradient-to-r from-blue-400 to-blue-500",
    icon: DollarSign
  },
  fechamento: {
    label: "Fechamento",
    color: "bg-gradient-to-r from-orange-400 to-orange-500",
    icon: DollarSign
  },
  ganho: {
    label: "Ganho",
    color: "bg-gradient-to-r from-green-500 to-green-600",
    icon: DollarSign
  },
  perdido: {
    label: "Perdido",
    color: "bg-gradient-to-r from-red-400 to-red-500",
    icon: DollarSign
  }
};
const ETAPAS_ATIVAS: EtapaPipeline[] = ["prospeccao", "qualificacao", "proposta", "negociacao", "fechamento"];
export function PipelineKanban({
  vendas,
  onMoverCard,
  onEditarVenda,
  onNovaVenda
}: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }));
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const novaEtapa = over.id as EtapaPipeline;
      onMoverCard(active.id as string, novaEtapa);
    }
    setActiveId(null);
  };
  const getVendasPorEtapa = (etapa: EtapaPipeline) => {
    return vendas.filter(v => v.etapa_pipeline === etapa);
  };
  const calcularValorTotal = (etapa: EtapaPipeline) => {
    return getVendasPorEtapa(etapa).reduce((sum, v) => sum + (v.valor_estimado || v.valor_total), 0);
  };
  const activeVenda = activeId ? vendas.find(v => v.id === activeId) : null;
  return <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-foreground uppercase tracking-tight text-lg">Funil de Vendas</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas oportunidades por etapa</p>
        </div>
        <Button onClick={onNovaVenda} className="shadow-md">
          <Plus size={16} className="mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary shadow-sm rounded-md">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total em Pipeline</p>
          <p className="text-2xl font-bold text-foreground">
            {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
          }).format(ETAPAS_ATIVAS.reduce((sum, etapa) => sum + calcularValorTotal(etapa), 0))}
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm rounded-md">
          <p className="text-sm font-medium text-muted-foreground mb-1">Oportunidades Ativas</p>
          <p className="text-2xl font-bold text-foreground">
            {ETAPAS_ATIVAS.reduce((sum, etapa) => sum + getVendasPorEtapa(etapa).length, 0)}
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm bg-emerald-50/50 rounded-md">
          <p className="text-sm font-medium text-emerald-700 mb-1">Vendas Ganhas</p>
          <p className="text-2xl font-bold text-emerald-600">
            {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
          }).format(calcularValorTotal("ganho"))}
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500 shadow-sm bg-rose-50/50 rounded-md">
          <p className="text-sm font-medium text-rose-700 mb-1">Vendas Perdidas</p>
          <p className="text-2xl font-bold text-rose-600">
            {getVendasPorEtapa("perdido").length}
          </p>
        </Card>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS_ATIVAS.map(etapa => {
          const vendasEtapa = getVendasPorEtapa(etapa);
          const config = ETAPAS_CONFIG[etapa];
          return <KanbanColumn key={etapa} id={etapa} title={config.label} count={vendasEtapa.length} totalValue={calcularValorTotal(etapa)} color={config.color}>
                <SortableContext items={vendasEtapa.map(v => v.id)} strategy={verticalListSortingStrategy}>
                  {vendasEtapa.map(venda => <KanbanCard key={venda.id} venda={venda} onEdit={() => onEditarVenda(venda)} />)}
                </SortableContext>
              </KanbanColumn>;
        })}
        </div>

        <DragOverlay>
          {activeVenda ? <KanbanCard venda={activeVenda} onEdit={() => {}} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Seção de Ganhos e Perdas */}
      
    </div>;
}