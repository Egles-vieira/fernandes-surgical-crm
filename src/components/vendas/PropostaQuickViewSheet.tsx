import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, Calendar, TrendingUp, Package, Eye, Copy, User, 
  Mail, Phone, MapPin, Clock, FileText, ChevronRight, 
  Activity, CheckCircle2, X
} from "lucide-react";
import { useVendaDetalhes } from "@/hooks/useVendaDetalhes";
import { useTimelineUnificada } from "@/hooks/useTimelineUnificada";
import type { VendaPipelineCard } from "@/hooks/useVendasPipeline";

interface PropostaQuickViewSheetProps {
  venda: VendaPipelineCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicar?: (venda: VendaPipelineCard) => void;
}

const ETAPAS_PIPELINE = [
  { key: "prospeccao", label: "Prospecção" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
  { key: "followup_cliente", label: "Follow-up" },
  { key: "fechamento", label: "Fechamento" },
];

const ETAPAS_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  followup_cliente: "Follow-up Cliente",
  fechamento: "Fechamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function PropostaQuickViewSheet({ 
  venda, 
  open, 
  onOpenChange,
  onDuplicar 
}: PropostaQuickViewSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("atividades");
  
  const { venda: vendaCompleta, isLoading } = useVendaDetalhes({
    vendaId: venda?.id || null,
    enabled: open && !!venda?.id
  });

  const { data: timeline, isLoading: isLoadingTimeline } = useTimelineUnificada({
    venda_id: venda?.id || undefined,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDetails = () => {
    if (venda) {
      navigate(`/vendas/${venda.id}`);
      onOpenChange(false);
    }
  };

  const handleDuplicar = () => {
    if (venda && onDuplicar) {
      onDuplicar(venda);
      onOpenChange(false);
    }
  };

  const getCurrentStageIndex = () => {
    if (!venda?.etapa_pipeline) return 0;
    return ETAPAS_PIPELINE.findIndex(e => e.key === venda.etapa_pipeline);
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl p-0 gap-0">
        {/* Header com indicador de posição */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Proposta #{venda?.numero_venda?.slice(-8) || "..."}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100vh-80px)]">
          {/* COLUNA ESQUERDA - Resumo */}
          <div className="w-[340px] border-r bg-card flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* Tags */}
                <div className="flex gap-2 flex-wrap">
                  {(venda?.probabilidade || 0) >= 70 && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                      HOT LEAD
                    </Badge>
                  )}
                  {vendaCompleta?.clientes && (
                    <Badge variant="outline" className="text-xs">
                      Cliente Ativo
                    </Badge>
                  )}
                </div>

                {/* Número e título */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Proposta #{venda?.numero_venda?.slice(-10)}
                  </p>
                  <h2 className="text-xl font-bold text-foreground">
                    {venda?.cliente_nome || "Sem cliente"}
                  </h2>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button onClick={handleViewDetails} className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleDuplicar}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                {/* Card de valor */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">
                      {ETAPAS_LABELS[venda?.etapa_pipeline || ""] || "Em andamento"}
                    </span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={handleViewDetails}>
                      Ver
                    </Button>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(vendaCompleta?.valor_total || venda?.valor_estimado || 0)}
                  </p>
                </div>

                <Separator />

                {/* Detalhes do contato */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Detalhes do Cliente</h4>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(venda?.cliente_nome || "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{venda?.cliente_nome || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                    </div>
                  </div>

                  {vendaCompleta?.clientes && (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-foreground">-</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="text-foreground">-</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Vendedor */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Vendedor</h4>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">Vendedor Responsável</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* COLUNA DIREITA - Detalhes com abas */}
          <div className="flex-1 flex flex-col bg-background">
            {/* Header com barra de etapas */}
            <div className="p-5 border-b space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pipeline:</span>
                  <span className="font-medium">Vendas</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-muted-foreground">Etapa:</span>
                  <span className="font-medium">
                    {ETAPAS_LABELS[venda?.etapa_pipeline || ""] || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Criado em {formatDate(vendaCompleta?.created_at || null)}</span>
                </div>
              </div>

              {/* Barra de progresso das etapas */}
              <div className="flex gap-1">
                {ETAPAS_PIPELINE.map((etapa, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  
                  return (
                    <div 
                      key={etapa.key}
                      className={`
                        flex-1 h-8 rounded flex items-center justify-center text-xs font-medium
                        transition-colors
                        ${isCompleted 
                          ? "bg-success/20 text-success border border-success/30" 
                          : isCurrent 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }
                      `}
                    >
                      {etapa.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b px-5">
                <TabsList className="h-12 bg-transparent p-0 gap-4">
                  <TabsTrigger 
                    value="atividades" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                  >
                    Atividades
                  </TabsTrigger>
                  <TabsTrigger 
                    value="itens" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                  >
                    Itens
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {vendaCompleta?.vendas_itens?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notas" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                  >
                    Notas
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                {/* Tab Atividades */}
                <TabsContent value="atividades" className="m-0 p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Últimas Atividades</h4>
                    </div>

                    {isLoadingTimeline ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : timeline && timeline.length > 0 ? (
                      <div className="space-y-4">
                        {timeline.slice(0, 5).map((item: any, index: number) => (
                          <div key={item.id || index} className="flex gap-3">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm">{item.titulo}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.descricao || "Sem descrição"}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDateTime(item.criado_em)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {timeline.length > 5 && (
                          <Button variant="link" size="sm" className="px-0" onClick={handleViewDetails}>
                            Ver mais atividades
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhuma atividade registrada
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab Itens */}
                <TabsContent value="itens" className="m-0 p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Itens da Proposta</h4>
                    </div>

                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : vendaCompleta?.vendas_itens && vendaCompleta.vendas_itens.length > 0 ? (
                      <div className="space-y-2">
                        {vendaCompleta.vendas_itens.map((item: any) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.produtos?.nome || "Produto"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.produtos?.referencia_interna || "-"} • Qtd: {item.quantidade}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm">
                                {formatCurrency(item.valor_total || 0)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.valor_unitario || 0)}/un
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Total */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 mt-4">
                          <span className="font-semibold">Total</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(vendaCompleta.valor_total || 0)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum item na proposta
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab Notas */}
                <TabsContent value="notas" className="m-0 p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Notas</h4>
                    </div>

                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma nota adicionada
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
