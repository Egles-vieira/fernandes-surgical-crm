import { Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar, AlertTriangle, DollarSign, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OportunidadeCard, PipelineCustomField } from "@/types/pipelines";
import { parseFieldOptions } from "@/hooks/pipelines/usePipelineFields";
import { cn } from "@/lib/utils";

interface PipelineKanbanCardProps {
  oportunidade: OportunidadeCard;
  index: number;
  kanbanFields?: PipelineCustomField[];
  kanbanLookups?: {
    condicoesPagamento?: Record<string, string>;
    tiposPedido?: Record<string, string>;
    tiposFrete?: Record<string, string>;
  };
  onClick: () => void;
}

export function PipelineKanbanCard({
  oportunidade,
  index,
  kanbanFields = [],
  kanbanLookups,
  onClick
}: PipelineKanbanCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yy", {
        locale: ptBR
      });
    } catch {
      return dateStr;
    }
  };

  // Formatar valor de campo customizado baseado no tipo inferido e metadados
  const formatFieldValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "-";
    
    // Tentar encontrar o campo nos metadados para resolver selects
    const field = kanbanFields.find((f) => f.nome_campo === key);

    if (field) {
      // Select comum (opções embutidas)
      if (field.tipo_campo === "select") {
        const options = parseFieldOptions(field.opcoes);
        const option = options.find((o) => String(o.value) === String(value));
        return option?.label || String(value);
      }

      // Selects especiais (lookup via tabelas auxiliares)
      if (field.tipo_campo === "select_condicao_pagamento") {
        return (
          kanbanLookups?.condicoesPagamento?.[String(value)] ?? String(value)
        );
      }

      if (field.tipo_campo === "select_tipo_pedido") {
        return kanbanLookups?.tiposPedido?.[String(value)] ?? String(value);
      }

      if (field.tipo_campo === "select_tipo_frete") {
        return kanbanLookups?.tiposFrete?.[String(value)] ?? String(value);
      }

      // Multiselect comum (opções embutidas)
      if (field.tipo_campo === "multiselect" && Array.isArray(value)) {
        const options = parseFieldOptions(field.opcoes);
        return value
          .map((v: string) => {
            const opt = options.find((o) => String(o.value) === String(v));
            return opt?.label || v;
          })
          .join(", ");
      }
    }
    
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number") {
      // Verifica se parece ser moeda (valores altos)
      if (value > 100) {
        return new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
      }
      return String(value);
    }
    if (typeof value === "string") {
      // Tenta detectar data ISO
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        try {
          return format(parseISO(value), "dd/MM/yy", {
            locale: ptBR
          });
        } catch {
          return value;
        }
      }
      return value;
    }
    return String(value);
  };

  // Barra de progresso baseada na probabilidade
  const probabilidade = oportunidade.probabilidade || 0;
  const progressColor = probabilidade >= 70 ? "bg-green-500" : probabilidade >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <Draggable draggableId={oportunidade.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            "border border-border/50 bg-background",
            "w-full min-w-0 max-w-full overflow-hidden",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/20",
            oportunidade.estaEstagnado && "border-l-4 border-l-amber-500"
          )}
        >
          {/* Barra de probabilidade no topo */}
          <div className="h-1 w-full bg-muted">
            <div
              className={cn("h-full transition-all", progressColor)}
              style={{ width: `${probabilidade}%` }}
            />
          </div>

          <div className="p-3 bg-secondary-foreground overflow-hidden min-w-0">
            {/* Header: Nome + Valor */}
            <div className="flex items-start justify-between gap-2 mb-2 overflow-hidden">
              <div className="flex-1 min-w-0 overflow-hidden">
              <h4
                  className="font-medium text-sm text-foreground truncate"
                  title={oportunidade.nome}
                >
                  {oportunidade.nome.length > 25 
                    ? `${oportunidade.nome.substring(0, 25)}...` 
                    : oportunidade.nome}
                </h4>
                {oportunidade.codigo && (
                  <span
                    className="text-xs text-muted-foreground block truncate"
                    title={`#${oportunidade.codigo}`}
                  >
                    #{oportunidade.codigo}
                  </span>
                )}
              </div>
            </div>

            {/* Valor em destaque */}
            {oportunidade.valor != null && oportunidade.valor > 0 && (
              <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded bg-primary/10 overflow-hidden">
                <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-bold text-primary truncate">
                  {formatCurrency(oportunidade.valor)}
                </span>
                {oportunidade.valorPonderado != null && (
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    Pond: {formatCurrency(oportunidade.valorPonderado)}
                  </span>
                )}
              </div>
            )}

            {/* Info: Conta, Contato, Data */}
            <div className="space-y-1 text-xs text-muted-foreground overflow-hidden">
              {oportunidade.conta && (
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1 min-w-0">{oportunidade.conta}</span>
                </div>
              )}
              {oportunidade.contato && (
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1 min-w-0">{oportunidade.contato}</span>
                </div>
              )}
              {oportunidade.dataFechamento && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{formatDate(oportunidade.dataFechamento)}</span>
                </div>
              )}
            </div>

            {/* Footer: Probabilidade + Dias no estágio */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tag WhatsApp */}
                {oportunidade.origemLead?.toLowerCase().includes("whatsapp") && (
                  <Badge className="text-xs px-1.5 py-0 bg-green-500 hover:bg-green-600 text-white">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    WhatsApp
                  </Badge>
                )}
                {probabilidade > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {probabilidade}%
                  </Badge>
                )}
                {oportunidade.estaEstagnado && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs">Estagnado</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {oportunidade.diasNoEstagio}d
              </span>
            </div>

            {/* Campos customizados visíveis no Kanban */}
            {Object.keys(oportunidade.camposKanban).length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1 overflow-hidden">
                {Object.entries(oportunidade.camposKanban)
                  .slice(0, 3)
                  .map(([key, value]) => {
                    // Buscar label do campo nos metadados
                    const field = kanbanFields.find(f => f.nome_campo === key);
                    const displayLabel = field?.label || key.replace(/_/g, " ");
                    
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs gap-2 min-w-0 overflow-hidden"
                      >
                        <span className="text-muted-foreground capitalize truncate flex-1 min-w-0">
                          {displayLabel}
                        </span>
                        <span className="font-medium text-foreground truncate shrink-0 max-w-[50%]">
                          {formatFieldValue(key, value)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </Card>
      )}
    </Draggable>
  );
}