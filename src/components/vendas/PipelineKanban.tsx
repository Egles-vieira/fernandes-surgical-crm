import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Users, DollarSign } from "lucide-react";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";

export type EtapaPipeline = 
  | "prospeccao"
  | "qualificacao" 
  | "proposta"
  | "negociacao"
  | "fechamento"
  | "ganho"
  | "perdido";

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

const ETAPAS_CONFIG: Record<EtapaPipeline, { label: string; color: string; icon: any }> = {
  prospeccao: { label: "Prospecção", color: "bg-slate-100 border-slate-300", icon: Users },
  qualificacao: { label: "Qualificação", color: "bg-blue-100 border-blue-300", icon: TrendingUp },
  proposta: { label: "Proposta", color: "bg-purple-100 border-purple-300", icon: DollarSign },
  negociacao: { label: "Negociação", color: "bg-yellow-100 border-yellow-300", icon: DollarSign },
  fechamento: { label: "Fechamento", color: "bg-orange-100 border-orange-300", icon: DollarSign },
  ganho: { label: "Ganho", color: "bg-green-100 border-green-300", icon: DollarSign },
  perdido: { label: "Perdido", color: "bg-red-100 border-red-300", icon: DollarSign },
};

const ETAPAS_ATIVAS: EtapaPipeline[] = [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "fechamento",
];

export function PipelineKanban({ vendas, onMoverCard, onEditarVenda, onNovaVenda }: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
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

  return (
    <div className="space-y-4">
      {/* Header com Estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Pipeline de Vendas</h2>
          <p className="text-muted-foreground">Gerencie suas oportunidades por etapa</p>
        </div>
        <Button onClick={onNovaVenda}>
          <Plus size={16} className="mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total em Pipeline</p>
          <p className="text-2xl font-bold text-primary">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              ETAPAS_ATIVAS.reduce((sum, etapa) => sum + calcularValorTotal(etapa), 0)
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Oportunidades Ativas</p>
          <p className="text-2xl font-bold text-primary">
            {ETAPAS_ATIVAS.reduce((sum, etapa) => sum + getVendasPorEtapa(etapa).length, 0)}
          </p>
        </Card>
        <Card className="p-4 bg-green-50">
          <p className="text-sm text-muted-foreground">Vendas Ganhas</p>
          <p className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              calcularValorTotal("ganho")
            )}
          </p>
        </Card>
        <Card className="p-4 bg-red-50">
          <p className="text-sm text-muted-foreground">Vendas Perdidas</p>
          <p className="text-2xl font-bold text-red-600">
            {getVendasPorEtapa("perdido").length}
          </p>
        </Card>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS_ATIVAS.map((etapa) => {
            const vendasEtapa = getVendasPorEtapa(etapa);
            const config = ETAPAS_CONFIG[etapa];
            
            return (
              <KanbanColumn
                key={etapa}
                id={etapa}
                title={config.label}
                count={vendasEtapa.length}
                totalValue={calcularValorTotal(etapa)}
                color={config.color}
              >
                <SortableContext
                  items={vendasEtapa.map(v => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {vendasEtapa.map((venda) => (
                    <KanbanCard
                      key={venda.id}
                      venda={venda}
                      onEdit={() => onEditarVenda(venda)}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeVenda ? (
            <KanbanCard venda={activeVenda} onEdit={() => {}} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Seção de Ganhos e Perdas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card className="p-4 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-700">✅ Ganho ({getVendasPorEtapa("ganho").length})</h3>
            <Badge variant="outline" className="bg-green-100">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcularValorTotal("ganho"))}
            </Badge>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getVendasPorEtapa("ganho").map(venda => (
              <div key={venda.id} className="p-2 bg-green-50 rounded border border-green-200 cursor-pointer hover:bg-green-100" onClick={() => onEditarVenda(venda)}>
                <p className="text-sm font-medium">{venda.cliente_nome}</p>
                <p className="text-xs text-muted-foreground">{venda.numero_venda}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 border-red-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-red-700">❌ Perdido ({getVendasPorEtapa("perdido").length})</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getVendasPorEtapa("perdido").map(venda => (
              <div key={venda.id} className="p-2 bg-red-50 rounded border border-red-200 cursor-pointer hover:bg-red-100" onClick={() => onEditarVenda(venda)}>
                <p className="text-sm font-medium">{venda.cliente_nome}</p>
                <p className="text-xs text-muted-foreground">{venda.numero_venda}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
