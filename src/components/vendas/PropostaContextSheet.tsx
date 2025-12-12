import { useState } from "react";
import { 
  PanelRightOpen, 
  PanelRightClose, 
  Clock, 
  CheckSquare, 
  Building2, 
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Eye,
  MousePointer,
  Timer,
  Monitor,
  Smartphone,
  ThumbsUp,
  ThumbsDown,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TimelineUnificada } from "@/components/atividades/TimelineUnificada";
import { NovaAtividadeDialog } from "@/components/atividades/NovaAtividadeDialog";
import { AtividadeDetalhesSheet } from "@/components/atividades/AtividadeDetalhesSheet";
import { useAtividades } from "@/hooks/useAtividades";
import { useGEDDocumentos } from "@/hooks/useGEDDocumentos";
import { usePropostaActivity } from "@/hooks/usePropostaActivity";
import { Tables } from "@/integrations/supabase/types";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Cliente = Tables<"clientes">;

interface PropostaContextSheetProps {
  vendaId: string;
  clienteId?: string | null;
  cliente?: Cliente | null;
  children: React.ReactNode;
}

export function PropostaContextSheet({ 
  vendaId, 
  clienteId, 
  cliente,
  children 
}: PropostaContextSheetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");
  const [showNovaAtividade, setShowNovaAtividade] = useState(false);
  const [atividadeSelecionadaId, setAtividadeSelecionadaId] = useState<string | null>(null);

  // Buscar atividades vinculadas apenas a esta proposta/venda
  const { atividades, isLoading: isLoadingAtividades } = useAtividades({
    filtros: { 
      venda_id: vendaId
    },
    limite: 20
  });

  // Buscar documentos do cliente
  const { documentos, isLoading: isLoadingDocs } = useGEDDocumentos({
    search: cliente?.nome_emit || "",
    pageSize: 10
  });

  // Buscar dados de tracking da proposta
  const { data: propostaActivity, isLoading: isLoadingTracking } = usePropostaActivity(vendaId);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatRelativeTime = (date: string | null | undefined) => {
    if (!date) return "-";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getDeviceIcon = (dispositivo: string | null | undefined) => {
    if (!dispositivo) return <Monitor className="h-4 w-4" />;
    const lower = dispositivo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "-";
    return phone;
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-64px)]">
      {/* Main Content Panel */}
      <ResizablePanel 
        defaultSize={isOpen ? 65 : 100} 
        minSize={50}
        className="relative"
      >
        <div className="h-full overflow-auto">
          {children}
        </div>
      </ResizablePanel>

      {/* Toggle Button - Always visible on right edge */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50 h-24 w-6 rounded-l-md rounded-r-none",
          "bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center transition-all",
          isOpen && "right-[35%]"
        )}
      >
        {isOpen ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
      </Button>

      {/* Context Sheet Panel */}
      {isOpen && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <div className="h-full border-l bg-card">
              <div className="flex h-14 items-center justify-between border-b px-4">
                <h3 className="font-semibold text-foreground">Contexto da Proposta</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100%-3.5rem)]">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                  <TabsTrigger 
                    value="timeline" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger 
                    value="atividades"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Atividades
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cliente"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Cliente
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documentos"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Docs
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(100%-2.5rem)] [&_[data-radix-scroll-area-viewport]]:scrollbar-context">
                  <TabsContent value="timeline" className="m-0 p-4">
                    <Accordion type="multiple" defaultValue={["historico"]} className="space-y-2">
                      {/* Seção de Tracking da Proposta */}
                      <AccordionItem value="engajamento" className="border rounded-lg px-3">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">Engajamento do Cliente</span>
                            {propostaActivity?.analytics && propostaActivity.analytics.length > 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {propostaActivity.analytics.length}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          {isLoadingTracking ? (
                            <div className="space-y-2">
                              <Skeleton className="h-16 w-full" />
                              <Skeleton className="h-16 w-full" />
                            </div>
                          ) : propostaActivity?.analytics && propostaActivity.analytics.length > 0 ? (
                            <div className="space-y-2">
                              {propostaActivity.analytics.map((view) => (
                                <Card key={view.id} className="overflow-hidden border-l-4 border-l-primary/50">
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {getDeviceIcon(view.device_type)}
                                        <div>
                                          <p className="text-sm font-medium">
                                            Visualização
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatRelativeTime(view.iniciado_em)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          <Timer className="h-3 w-3 mr-1" />
                                          {formatDuration(view.tempo_total_segundos)}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Detalhes do dispositivo */}
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <span>{view.browser_name || 'Navegador'}</span>
                                      {view.os_name && (
                                        <span className="ml-2">• {view.os_name}</span>
                                      )}
                                    </div>

                                    {/* Seções visitadas */}
                                    {propostaActivity.secoes && propostaActivity.secoes.filter(s => s.analytics_id === view.id).length > 0 && (
                                      <div className="mt-3 pt-2 border-t">
                                        <p className="text-xs font-medium mb-2">Seções visitadas:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {propostaActivity.secoes
                                            .filter(s => s.analytics_id === view.id)
                                            .map(secao => (
                                              <Badge key={secao.id} variant="secondary" className="text-xs">
                                                {secao.secao_nome} ({formatDuration(secao.tempo_visivel_segundos)})
                                              </Badge>
                                            ))
                                          }
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <Card className="bg-muted/30">
                              <CardContent className="p-4 text-center">
                                <Eye className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Nenhuma visualização registrada
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Compartilhe o link da proposta para rastrear o engajamento
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      {/* Ações do Cliente */}
                      {propostaActivity?.cliques && propostaActivity.cliques.length > 0 && (
                        <AccordionItem value="acoes" className="border rounded-lg px-3">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-2">
                              <MousePointer className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold">Ações do Cliente</span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {propostaActivity.cliques.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-3 space-y-2">
                            {propostaActivity.cliques.map(clique => (
                              <Card key={clique.id} className={cn(
                                "overflow-hidden border-l-4",
                                clique.tipo_acao === 'aceitar' && "border-l-success",
                                clique.tipo_acao === 'recusar' && "border-l-destructive",
                                !['aceitar', 'recusar'].includes(clique.tipo_acao || '') && "border-l-muted"
                              )}>
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {clique.tipo_acao === 'aceitar' ? (
                                        <ThumbsUp className="h-4 w-4 text-success" />
                                      ) : clique.tipo_acao === 'recusar' ? (
                                        <ThumbsDown className="h-4 w-4 text-destructive" />
                                      ) : (
                                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className="text-sm font-medium capitalize">
                                        {clique.tipo_acao || 'Clique'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(clique.clicado_em)}
                                    </span>
                                  </div>
                                  {clique.elemento_texto && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {clique.elemento_texto}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Respostas */}
                      {propostaActivity?.respostas && propostaActivity.respostas.length > 0 && (
                        <AccordionItem value="respostas" className="border rounded-lg px-3">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-2">
                              <CheckSquare className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold">Respostas</span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {propostaActivity.respostas.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-3 space-y-2">
                            {propostaActivity.respostas.map(resposta => (
                              <Card key={resposta.id} className={cn(
                                "overflow-hidden border-l-4",
                                resposta.tipo_resposta === 'aceite' && "border-l-success",
                                resposta.tipo_resposta === 'recusa' && "border-l-destructive"
                              )}>
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {resposta.tipo_resposta === 'aceite' ? (
                                        <ThumbsUp className="h-4 w-4 text-success" />
                                      ) : (
                                        <ThumbsDown className="h-4 w-4 text-destructive" />
                                      )}
                                      <span className="text-sm font-medium">
                                        Proposta {resposta.tipo_resposta === 'aceite' ? 'Aceita' : 'Recusada'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(resposta.respondido_em)}
                                    </span>
                                  </div>
                                  {resposta.nome_respondente && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Por: {resposta.nome_respondente}
                                    </p>
                                  )}
                                  {resposta.comentario && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                      "{resposta.comentario}"
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Timeline de Atividades */}
                      <AccordionItem value="historico" className="border rounded-lg px-3">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">Histórico de Atividades</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <TimelineUnificada vendaId={vendaId} limite={30} />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TabsContent>

                  {/* Atividades Tab */}
                  <TabsContent value="atividades" className="m-0 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Atividades ({atividades?.length || 0})
                      </h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowNovaAtividade(true)}
                      >
                        <CheckSquare className="mr-2 h-3 w-3" />
                        Nova
                      </Button>
                    </div>

                    {isLoadingAtividades ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : atividades && atividades.length > 0 ? (
                      <div className="space-y-3">
                        {atividades.map(atividade => (
                          <Card 
                            key={atividade.id} 
                            className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setAtividadeSelecionadaId(atividade.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{atividade.titulo}</p>
                                  {atividade.descricao && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {atividade.descricao}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <Badge 
                                    variant={
                                      atividade.status === 'concluida' ? 'default' :
                                      atividade.status === 'em_andamento' ? 'secondary' : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {atividade.status}
                                  </Badge>
                                  {atividade.status === 'concluida' && atividade.concluida_no_prazo !== null && (
                                    <Badge 
                                      variant={atividade.concluida_no_prazo ? 'default' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {atividade.concluida_no_prazo ? 'No prazo' : 'Atrasada'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {atividade.data_vencimento 
                                  ? formatDate(atividade.data_vencimento)
                                  : "Sem prazo"
                                }
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma atividade</p>
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={() => setShowNovaAtividade(true)}
                        >
                          Criar primeira atividade
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Cliente Tab */}
                  <TabsContent value="cliente" className="m-0 p-4">
                    {cliente ? (
                      <div className="space-y-4">
                        {/* Header do Cliente */}
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{cliente.nome_emit}</h4>
                            <p className="text-sm text-muted-foreground">{cliente.nome_fantasia || cliente.nome_abrev}</p>
                          </div>
                        </div>

                        <Separator />

                        {/* Informações Fiscais */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            Informações Fiscais
                          </h5>
                          <div className="grid gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="shrink-0">CNPJ</Badge>
                              <span className="truncate">{cliente.cgc || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="shrink-0">IE</Badge>
                              <span className="truncate">{cliente.ins_estadual || "-"}</span>
                            </div>
                            {cliente.natureza && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="shrink-0">Natureza</Badge>
                                <span>{cliente.natureza}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Contato */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            Contato
                          </h5>
                          <div className="space-y-2">
                            {cliente.telefone1 && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{formatPhone(cliente.telefone1)}</span>
                              </div>
                            )}
                            {cliente.e_mail && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{cliente.e_mail}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Financeiro */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            Financeiro
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            <Card className="p-3">
                              <p className="text-xs text-muted-foreground">Limite de Crédito</p>
                              <p className="font-semibold text-sm">{formatCurrency(cliente.lim_credito)}</p>
                            </Card>
                            <Card className="p-3">
                              <p className="text-xs text-muted-foreground">Disponível</p>
                              <p className="font-semibold text-sm text-success">{formatCurrency(cliente.limite_disponivel)}</p>
                            </Card>
                          </div>
                        </div>

                        {/* Observações */}
                        {cliente.observacoes && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                Observações
                              </h5>
                              <p className="text-sm text-muted-foreground">{cliente.observacoes}</p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum cliente selecionado</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Documentos Tab */}
                  <TabsContent value="documentos" className="m-0 p-4">
                    {isLoadingDocs ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : documentos && documentos.length > 0 ? (
                      <div className="space-y-3">
                        {documentos.map(doc => (
                          <Card key={doc.id} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{doc.titulo}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.numero_documento || "Sem número"}
                                  </p>
                                </div>
                                <Badge 
                                  variant={doc.status_validade === 'vigente' ? 'default' : 'destructive'}
                                  className="shrink-0 text-xs"
                                >
                                  {doc.status_validade}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum documento</p>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          </ResizablePanel>
        </>
      )}

      {/* Nova Atividade Dialog */}
      <NovaAtividadeDialog
        open={showNovaAtividade}
        onOpenChange={setShowNovaAtividade}
        vendaId={vendaId}
        clienteId={clienteId || undefined}
      />

      {/* Atividade Detalhes Sheet */}
      <AtividadeDetalhesSheet
        atividadeId={atividadeSelecionadaId}
        open={!!atividadeSelecionadaId}
        onOpenChange={(open) => !open && setAtividadeSelecionadaId(null)}
      />
    </ResizablePanelGroup>
  );
}
