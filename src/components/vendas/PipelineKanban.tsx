import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, DollarSign, Briefcase, Users, LayoutGrid, GripVertical, Clock, UserCircle2, Sparkles, AlertCircle } from "lucide-react";
export type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "fechamento" | "ganho" | "perdido";

// Mapa de conversão para garantir compatibilidade
export const ETAPAS_CONFIG_MAP: Record<string, EtapaPipeline | null> = {
  "prospeccao": "prospeccao",
  "qualificacao": "qualificacao",
  "proposta": "proposta",
  "negociacao": "negociacao",
  "fechamento": "fechamento",
  "ganho": "ganho",
  "perdido": "perdido"
};
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
  bgLight: string;
  textColor: string;
  borderColor: string;
}> = {
  prospeccao: {
    label: "LEADS DE ENTRADA",
    color: "bg-blue-500",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200"
  },
  qualificacao: {
    label: "CONTATO INICIAL",
    color: "bg-indigo-500",
    bgLight: "bg-indigo-50",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-200"
  },
  proposta: {
    label: "PROPOSTA ENVIADA",
    color: "bg-violet-500",
    bgLight: "bg-violet-50",
    textColor: "text-violet-700",
    borderColor: "border-violet-200"
  },
  negociacao: {
    label: "NEGOCIAÇÃO",
    color: "bg-amber-500",
    bgLight: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200"
  },
  fechamento: {
    label: "FECHAMENTO",
    color: "bg-emerald-500",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200"
  },
  ganho: {
    label: "GANHO",
    color: "bg-green-500",
    bgLight: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200"
  },
  perdido: {
    label: "PERDIDO",
    color: "bg-red-500",
    bgLight: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200"
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};
const ETAPAS_ATIVAS: EtapaPipeline[] = ["prospeccao", "qualificacao", "proposta", "negociacao", "fechamento"];
export function PipelineKanban({
  vendas,
  onMoverCard,
  onEditarVenda,
  onNovaVenda
}: PipelineKanbanProps) {
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const destStage = destination.droppableId as EtapaPipeline;
    const etapasValidas: EtapaPipeline[] = ["prospeccao", "qualificacao", "proposta", "negociacao", "fechamento", "ganho", "perdido"];
    
    if (etapasValidas.includes(destStage)) {
      onMoverCard(result.draggableId, destStage);
    }
  };
  const getVendasPorEtapa = (etapa: EtapaPipeline) => {
    return vendas.filter(v => v.etapa_pipeline === etapa);
  };
  const calcularValorTotal = (etapa: EtapaPipeline) => {
    return getVendasPorEtapa(etapa).reduce((sum, v) => sum + (v.valor_estimado || v.valor_total), 0);
  };
  const stats = {
    total: ETAPAS_ATIVAS.reduce((sum, etapa) => sum + calcularValorTotal(etapa), 0),
    count: ETAPAS_ATIVAS.reduce((sum, etapa) => sum + getVendasPorEtapa(etapa).length, 0),
    won: calcularValorTotal("ganho")
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 p-[5px]">
      {/* Metrics HUD */}
      <div className="px-6 py-5 pb-4 shrink-0">
        <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex divide-x divide-slate-100">
          <div className="flex-1 px-5 py-3 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Total</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.total)}</p>
            </div>
          </div>
          <div className="flex-1 px-5 py-3 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Previsão (Weighted)</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.total * 0.4)}</p>
            </div>
          </div>
          <div className="flex-1 px-5 py-3 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Oportunidades</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight">{stats.count} <span className="text-sm font-medium text-slate-400">Ativas</span></p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center">
            <Button onClick={onNovaVenda} className="bg-indigo-600 hover:bg-indigo-700 shadow-md flex items-center gap-2">
              <Plus size={16} />
              Nova Oportunidade
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full gap-0 pb-4 min-w-max overflow-x-auto overflow-y-hidden custom-scrollbar">
            {ETAPAS_ATIVAS.map((etapa) => {
              const vendasEtapa = getVendasPorEtapa(etapa);
              const totalVal = calcularValorTotal(etapa);
              const config = ETAPAS_CONFIG[etapa];

              return (
                <div key={etapa} className="flex flex-col w-80 mr-2 group h-full">
                  {/* Process Step Header */}
                  <div className={`h-14 flex items-center justify-between pr-6 ${config.color} text-white shadow-md z-10`}>
                    <div className="flex flex-col pl-6">
                      <span className="font-bold text-sm uppercase tracking-wider">{config.label}</span>
                      <span className="text-[10px] opacity-80 font-medium tracking-wide">{vendasEtapa.length} DEALS • {formatCurrency(totalVal)}</span>
                    </div>
                  </div>

                  {/* Column Body */}
                  <Droppable droppableId={etapa}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 border-x border-b border-slate-200/60 p-2 pt-4 space-y-3 overflow-y-auto custom-scrollbar transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50/50'}`}
                      >
                        {vendasEtapa.map((venda, index) => (
                          <Draggable key={venda.id} draggableId={venda.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 group/card relative transition-all duration-200 ${
                                  snapshot.isDragging 
                                    ? 'z-50 shadow-2xl rotate-2 scale-105 ring-2 ring-indigo-500/50 cursor-grabbing' 
                                    : 'hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 cursor-grab'
                                }`}
                                style={{...provided.draggableProps.style}}
                                onClick={() => {
                                  if (!snapshot.isDragging) {
                                    onEditarVenda(venda);
                                  }
                                }}
                              >
                                {/* Top Accent Line */}
                                <div className={`absolute top-0 left-3 right-3 h-0.5 ${config.color} opacity-0 group-hover/card:opacity-100 transition-opacity`}></div>
                                
                                {/* Grip Handle */}
                                <div 
                                  {...provided.dragHandleProps}
                                  className="absolute top-3 right-2 text-slate-300 hover:text-slate-500 cursor-grab p-1 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                  title="Arraste para mover"
                                >
                                  <GripVertical size={14} />
                                </div>

                                <div className="flex justify-between items-start mb-2 pr-6">
                                  <div className="flex gap-1 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-50 text-slate-500">
                                      {venda.numero_venda}
                                    </span>
                                  </div>
                                </div>
                                
                                {venda.data_fechamento_prevista && (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                                    <Clock size={10} /> {new Date(venda.data_fechamento_prevista).toLocaleDateString("pt-BR")}
                                  </div>
                                )}

                                <h4 className="font-bold text-slate-800 text-sm mb-1 leading-tight pr-2">{venda.cliente_nome}</h4>

                                <div className="flex items-end justify-between mt-3">
                                  <span className="font-bold text-slate-900">{formatCurrency(venda.valor_estimado || venda.valor_total)}</span>
                                  
                                  {/* Probability indicator */}
                                  <div className="flex items-center gap-2">
                                    {venda.probabilidade >= 70 && (
                                      <div className="w-6 h-6 rounded-full bg-emerald-100 border border-white flex items-center justify-center text-emerald-600">
                                        <Sparkles size={10} />
                                      </div>
                                    )}
                                    <div className="text-xs font-semibold text-slate-500">{venda.probabilidade}%</div>
                                  </div>
                                </div>

                                {/* Alert for low probability */}
                                {etapa === 'negociacao' && venda.probabilidade < 40 && (
                                  <div className="mt-3 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                    <AlertCircle size={12} />
                                    <span>Atenção requerida</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty State */}
                        {vendasEtapa.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg m-2 opacity-60">
                            <LayoutGrid size={24} className="text-slate-300 mb-2" />
                            <span className="text-xs font-medium text-slate-400">Vazio</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}