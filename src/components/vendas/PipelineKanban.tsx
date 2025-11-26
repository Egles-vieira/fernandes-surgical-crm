import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, DollarSign, Briefcase, LayoutGrid, Clock, Sparkles, AlertCircle, Copy, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  clientes?: {
    nome_emit: string | null;
    nome_abrev: string | null;
  };
}
interface PipelineKanbanProps {
  vendas: VendaPipeline[];
  onMoverCard: (vendaId: string, novaEtapa: EtapaPipeline) => void;
  onEditarVenda: (venda: VendaPipeline) => void;
  onNovaVenda: () => void;
  onDuplicarVenda: (venda: VendaPipeline) => void;
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
  onNovaVenda,
  onDuplicarVenda
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
      <div className="px-[5px] py-[5px] pb-[5px] shrink-0">
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Propostas</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight">{stats.count} <span className="text-sm font-medium text-slate-400">Ativas</span></p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center">
            <Button onClick={onNovaVenda} className="bg-indigo-600 hover:bg-indigo-700 shadow-md flex items-center gap-2">
              <Plus size={16} />
              Nova Proposta
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 px-[5px] pb-[5px]">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full gap-0 min-w-max overflow-x-auto overflow-y-hidden custom-scrollbar">
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
                                {...provided.dragHandleProps}
                                className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 group/card relative transition-all duration-200 ${
                                  snapshot.isDragging 
                                    ? 'z-50 shadow-2xl rotate-2 scale-105 ring-2 ring-indigo-500/50 cursor-grabbing' 
                                    : 'hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 cursor-grab'
                                }`}
                                style={{...provided.draggableProps.style}}
                                onClick={() => {
                                  if (!snapshot.isDragging) {
                                    onEditarVenda(venda);
                                  }
                                }}
                              >
                                {/* Top Accent Line */}
                                <div className={`absolute top-0 left-0 right-0 h-1 ${config.color} rounded-t-xl opacity-0 group-hover/card:opacity-100 transition-opacity`}></div>
                                
                                {/* Actions Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-slate-100 z-10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical size={14} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      onDuplicarVenda(venda);
                                    }}>
                                      <Copy size={14} className="mr-2" />
                                      Duplicar Proposta
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Header with Number and Probability */}
                                <div className="flex justify-between items-start mb-3 pr-8">
                                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-100">
                                    {venda.numero_venda}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {venda.probabilidade >= 70 && (
                                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-white shadow-sm">
                                        <Sparkles size={10} strokeWidth={2.5} />
                                      </div>
                                    )}
                                    <div className={`text-xs font-bold ${
                                      venda.probabilidade >= 70 ? 'text-emerald-600' : 
                                      venda.probabilidade >= 40 ? 'text-amber-600' : 
                                      'text-red-600'
                                    }`}>
                                      {venda.probabilidade}%
                                    </div>
                                  </div>
                                </div>

                                {/* Client Name */}
                                <h4 className="font-bold text-slate-800 text-base mb-2 leading-tight pr-2 line-clamp-2">
                                  {venda.clientes?.nome_emit || venda.clientes?.nome_abrev || venda.cliente_nome || "Cliente não definido"}
                                </h4>

                                {/* Date Info */}
                                {venda.data_fechamento_prevista && (
                                  <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                    <Clock size={12} strokeWidth={2} className="text-slate-400" />
                                    <span className="font-medium">Previsão:</span>
                                    <span className="font-semibold text-slate-700">
                                      {new Date(venda.data_fechamento_prevista).toLocaleDateString("pt-BR", { 
                                        day: '2-digit', 
                                        month: 'short' 
                                      })}
                                    </span>
                                  </div>
                                )}

                                {/* Value Section */}
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Valor Estimado</div>
                                      <div className="text-lg font-bold text-slate-900">
                                        {formatCurrency(venda.valor_estimado || venda.valor_total)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Potencial</div>
                                      <div className="text-sm font-bold text-indigo-600">
                                        {formatCurrency((venda.valor_estimado || venda.valor_total) * (venda.probabilidade / 100))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Alert for low probability */}
                                {etapa === 'negociacao' && venda.probabilidade < 40 && (
                                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 rounded-lg border border-amber-200">
                                    <AlertCircle size={14} strokeWidth={2.5} />
                                    <span className="font-semibold">Atenção requerida</span>
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