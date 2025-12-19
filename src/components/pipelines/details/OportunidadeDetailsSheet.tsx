import { useState, useEffect, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ExternalLink,
  Mail,
  Copy,
  Loader2,
  X,
  Building2,
  User,
  Phone,
  Calendar,
  Clock,
  Save,
  Package,
  Plus,
  Trash2,
  Search,
  Edit,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { ResizableSheetContent } from "@/components/ui/resizable-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOportunidade, useUpdateOportunidade, useMoverEstagio } from "@/hooks/pipelines/useOportunidades";
import { usePipelineFields } from "@/hooks/pipelines/usePipelineFields";
import { usePipelineComEstagios } from "@/hooks/pipelines/usePipelines";
import {
  useItensOportunidade,
  useRemoverItemOportunidade,
  useAtualizarItemOportunidade,
  ItemOportunidade,
} from "@/hooks/pipelines/useItensOportunidade";
import { EditarItemOportunidadeDialog } from "./EditarItemOportunidadeDialog";
import { useContatosCliente, ContatoCliente } from "@/hooks/useContatosCliente";
import { DynamicField } from "@/components/pipelines/fields/DynamicField";
import { PipelineStagesBar } from "./PipelineStagesBar";
import { ItensOportunidadeSheet } from "./ItensOportunidadeSheet";
import { ItensOportunidadeGrid } from "./ItensOportunidadeGrid";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { SpotFieldsSection } from "./SpotFieldsSection";
import { ContatoClienteSection } from "./ContatoClienteSection";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Cliente = Tables<"clientes">;

interface OportunidadeDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidadeId: string | null;
  pipelineId: string | null;
}

export function OportunidadeDetailsSheet({
  open,
  onOpenChange,
  oportunidadeId,
  pipelineId,
}: OportunidadeDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState("itens");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [camposCustomizados, setCamposCustomizados] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showItensSheet, setShowItensSheet] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [contatoSelecionadoId, setContatoSelecionadoId] = useState<string | null>(null);
  const [itemEditando, setItemEditando] = useState<ItemOportunidade | null>(null);
  const [showEditarItem, setShowEditarItem] = useState(false);
  const [isGridExpanded, setIsGridExpanded] = useState(true);
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Buscar dados da oportunidade
  const { data: oportunidade, isLoading } = useOportunidade(oportunidadeId);

  // Buscar pipeline com estágios
  const { estagios } = usePipelineComEstagios(pipelineId);

  // Buscar todos os campos do pipeline
  const { data: allFields } = usePipelineFields({
    pipelineId: pipelineId || "",
  });

  // Buscar itens da oportunidade
  const { data: itensOportunidade, isLoading: isLoadingItens } = useItensOportunidade(oportunidadeId);
  const removerItemMutation = useRemoverItemOportunidade();
  const atualizarItemMutation = useAtualizarItemOportunidade();

  // Mutation para atualizar
  const updateMutation = useUpdateOportunidade();
  const moverEstagioMutation = useMoverEstagio();

  // Buscar contatos do cliente selecionado
  const { contatos: contatosCliente, isLoading: isLoadingContatos } = useContatosCliente(clienteSelecionado?.id);

  // IDs dos itens existentes para excluir da busca
  const itensExistentesIds = useMemo(() => {
    return (itensOportunidade?.map((item) => item.produto_id).filter(Boolean) as string[]) || [];
  }, [itensOportunidade]);

  // Totais dos itens
  const totaisItens = useMemo(() => {
    if (!itensOportunidade) return { quantidade: 0, valor: 0 };
    return itensOportunidade.reduce(
      (acc, item) => ({
        quantidade: acc.quantidade + item.quantidade,
        valor: acc.valor + (item.preco_total || 0),
      }),
      { quantidade: 0, valor: 0 },
    );
  }, [itensOportunidade]);

  // Handler para mudar estágio
  const handleEstagioChange = async (novoEstagioId: string) => {
    if (!oportunidade || novoEstagioId === oportunidade.estagio_id) return;

    try {
      await moverEstagioMutation.mutateAsync({
        oportunidadeId: oportunidade.id,
        novoEstagioId,
      });
      toast.success("Estágio atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar estágio");
    }
  };

  // Sincronizar dados quando oportunidade carregar
  useEffect(() => {
    if (oportunidade) {
      setFormData({
        nome_oportunidade: oportunidade.nome_oportunidade,
        valor: oportunidade.valor,
        data_fechamento: (oportunidade as any).data_fechamento || oportunidade.data_fechamento_prevista,
        observacoes: oportunidade.observacoes,
      });
      setCamposCustomizados((oportunidade.campos_customizados as Record<string, unknown>) || {});
      setHasChanges(false);

      // Sincronizar cliente - buscar cod_emitente do banco
      if ((oportunidade as any).cliente_id) {
        const fetchClienteCompleto = async () => {
          const { data: clienteData } = await supabase
            .from("clientes")
            .select("id, nome_emit, cgc, cod_emitente, vendedor_id")
            .eq("id", (oportunidade as any).cliente_id)
            .maybeSingle();

          if (clienteData) {
            setClienteSelecionado(clienteData as Cliente);
          } else {
            // Fallback se não encontrar no banco
            setClienteSelecionado({
              id: (oportunidade as any).cliente_id,
              nome_emit: (oportunidade as any).cliente_nome,
              cgc: (oportunidade as any).cliente_cnpj,
              vendedor_id: (oportunidade as any).vendedor_id,
            } as Cliente);
          }
        };
        fetchClienteCompleto();
      } else {
        setClienteSelecionado(null);
      }

      // Sincronizar contato selecionado
      setContatoSelecionadoId((oportunidade as any).contato_id || null);
    }
  }, [oportunidade]);

  // Handler para selecionar cliente
  const handleSelecionarCliente = async (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setShowClienteSearch(false);
    setContatoSelecionadoId(null); // Reset contato ao trocar cliente

    if (!oportunidade) return;

    try {
      await updateMutation.mutateAsync({
        id: oportunidade.id,
        dados: {
          cliente_id: cliente.id,
          cliente_nome: cliente.nome_emit,
          cliente_cnpj: cliente.cgc,
          vendedor_id: cliente.vendedor_id || null,
          contato_id: null, // Reset contato ao trocar cliente
        },
      });
      toast.success("Cliente vinculado com sucesso");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handler para selecionar contato
  const handleSelecionarContato = async (contatoId: string | null) => {
    setContatoSelecionadoId(contatoId);

    if (!oportunidade) return;

    try {
      await updateMutation.mutateAsync({
        id: oportunidade.id,
        dados: {
          contato_id: contatoId,
        },
      });
      toast.success(contatoId ? "Contato vinculado" : "Contato removido");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldChange = (field: string, value: unknown) => {
    setCamposCustomizados((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!oportunidade) return;

    try {
      await updateMutation.mutateAsync({
        id: oportunidade.id,
        dados: {
          ...formData,
          campos_customizados: camposCustomizados as any,
        },
      });
      toast.success("Oportunidade atualizada com sucesso");
      setHasChanges(false);
    } catch (error) {
      toast.error("Erro ao atualizar oportunidade");
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/vendas?oportunidade=${oportunidadeId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd 'de' MMM. 'de' yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  // Agrupar campos por grupo
  const camposAgrupados =
    allFields?.reduce(
      (acc, campo) => {
        const grupo = campo.grupo || "Outros";
        if (!acc[grupo]) acc[grupo] = [];
        acc[grupo].push(campo);
        return acc;
      },
      {} as Record<string, typeof allFields>,
    ) || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        className="p-0 flex flex-col gap-0"
        defaultWidth={900}
        minWidth={600}
        maxWidth={1400}
        storageKey="oportunidade-sheet-width"
        isFullscreen={isFullscreen}
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : oportunidade ? (
          <>
            {/* Header com título e código */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Recolher" : "Expandir"}
                >
                  {isFullscreen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                <span className="text-lg font-semibold">
                  {oportunidade.codigo ? `Oportunidade #${oportunidade.codigo}` : "Oportunidade"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar Link
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conteúdo principal - duas colunas */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {/* Botão de colapsar painel lateral */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-6 rounded-l-none rounded-r-md bg-card hover:bg-accent border border-l-0"
                style={{ left: isLeftPanelExpanded ? "340px" : "0" }}
                onClick={() => setIsLeftPanelExpanded(!isLeftPanelExpanded)}
              >
                {isLeftPanelExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>

              {/* Coluna esquerda - Dados principais */}
              <div
                className={cn(
                  "border-r flex flex-col bg-card transition-all duration-300",
                  isLeftPanelExpanded ? "w-[340px]" : "w-0 overflow-hidden",
                )}
              >
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Badge de status */}
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Cliente Ativo
                    </Badge>

                    {/* Nome e código */}
                    <div>
                      <h2 className="text-lg font-bold mt-1">
                        {oportunidade.conta?.nome_conta || oportunidade.nome_oportunidade}
                      </h2>
                    </div>

                    <Separator />

                    {/* Detalhes do Cliente */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Cliente Vinculado</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setShowClienteSearch(true)}
                        >
                          <Search className="h-3 w-3 mr-1" />
                          {clienteSelecionado ? "Trocar" : "Vincular"}
                        </Button>
                      </div>

                      {clienteSelecionado ? (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {(clienteSelecionado.nome_emit || "?").substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{clienteSelecionado.nome_emit}</p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Cod:</span>{" "}
                                {clienteSelecionado.cod_emitente != null && `#${clienteSelecionado.cod_emitente} · `}{" "}
                                <span className="font-semibold">CNPJ:</span>{" "}
                                {clienteSelecionado.cgc}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 border border-dashed border-border rounded-lg text-center bg-card">
                          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhum cliente vinculado</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setShowClienteSearch(true)}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Buscar Cliente
                          </Button>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Contatos do Cliente */}
                    {clienteSelecionado && (
                      <>
                        <Separator />
                        <ContatoClienteSection
                          contatos={contatosCliente}
                          contatoSelecionadoId={contatoSelecionadoId}
                          onSelecionarContato={handleSelecionarContato}
                          isLoading={isLoadingContatos}
                        />
                      </>
                    )}

                    {/* Campos específicos do Pipeline Spot */}
                    {oportunidade.pipeline?.nome === "Spot" && (
                      <>
                        <Separator />
                        <SpotFieldsSection camposCustomizados={camposCustomizados} onChange={handleCustomFieldChange} />
                      </>
                    )}

                    {/* Vendedor */}
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Vendedor</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {(oportunidade as any)?.vendedor?.nome_completo ||
                            (clienteSelecionado?.vendedor_id ? "Vendedor vinculado" : "Nenhum vendedor")}
                        </span>
                      </div>
                    </div>

                    {/* Datas */}
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Criado em {formatDate(oportunidade.criado_em)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{oportunidade.dias_no_estagio || 0} dias no estágio</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Coluna direita - Pipeline e abas */}
              <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Header da coluna direita */}
                <div className="px-6 py-4 border-b space-y-4 bg-card">
                  {/* Pipeline e estágio */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Pipeline:</span>
                      <span className="font-medium text-foreground">{oportunidade.pipeline?.nome || "—"}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Etapa:</span>
                      <span className="font-medium text-foreground">{oportunidade.estagio?.nome_estagio || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(oportunidade.criado_em)}
                    </div>
                  </div>

                  {/* Navegação de estágios */}
                  <PipelineStagesBar
                    estagios={estagios || []}
                    estagioAtualId={oportunidade.estagio_id}
                    onEstagioClick={handleEstagioChange}
                    disabled={moverEstagioMutation.isPending}
                  />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-6 mt-4 justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                    <TabsTrigger
                      value="itens"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
                    >
                      Itens
                      {itensOportunidade && itensOportunidade.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-primary/10 text-primary">
                          {itensOportunidade.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="atividades"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
                    >
                      Atividades
                    </TabsTrigger>
                    <TabsTrigger
                      value="campos"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
                    >
                      Campos
                      {allFields && allFields.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-primary/10 text-primary">
                          {allFields.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="notas"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
                    >
                      Notas
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    <TabsContent value="itens" className="mt-0 px-6 py-4">
                      <Collapsible open={isGridExpanded} onOpenChange={setIsGridExpanded}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium">Itens da Proposta</h3>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              {isGridExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Recolher
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Expandir
                                </>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          {isLoadingItens ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <ItensOportunidadeGrid
                              itens={itensOportunidade || []}
                              oportunidadeId={oportunidadeId!}
                              onEdit={(item) => {
                                setItemEditando(item);
                                setShowEditarItem(true);
                              }}
                              onRemove={(itemId) => {
                                if (oportunidadeId) {
                                  removerItemMutation.mutate({
                                    itemId,
                                    oportunidadeId,
                                  });
                                }
                              }}
                              onAddItems={() => setShowItensSheet(true)}
                            />
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </TabsContent>

                    <TabsContent value="atividades" className="mt-0 px-6 py-4">
                      <h3 className="text-sm font-medium mb-4">Últimas Atividades</h3>
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Calendar className="h-12 w-12 mb-4 opacity-50" />
                        <p>Nenhuma atividade registrada</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="campos" className="mt-0 p-4 m-4 space-y-6 bg-card rounded-lg border">
                      {/* Campos básicos */}
                      <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                        <h3 className="text-sm font-semibold text-foreground">Informações Básicas</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label className="text-foreground">Nome da Oportunidade</Label>
                            <Input
                              className="bg-background"
                              value={(formData.nome_oportunidade as string) || ""}
                              onChange={(e) => handleFieldChange("nome_oportunidade", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground">Valor</Label>
                            <Input
                              className="bg-background"
                              type="number"
                              value={(formData.valor as number) || ""}
                              onChange={(e) => handleFieldChange("valor", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground">Data de Fechamento</Label>
                            <Input
                              className="bg-background"
                              type="date"
                              value={(formData.data_fechamento_prevista as string) || ""}
                              onChange={(e) => handleFieldChange("data_fechamento_prevista", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label className="text-foreground">Observações</Label>
                            <Textarea
                              className="bg-background"
                              value={(formData.observacoes as string) || ""}
                              onChange={(e) => handleFieldChange("observacoes", e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Campos customizados por grupo */}
                      {Object.entries(camposAgrupados).map(([grupo, campos]) => (
                        <div key={grupo} className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                          <h3 className="text-sm font-semibold text-foreground">{grupo}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {campos
                              ?.sort((a, b) => a.ordem - b.ordem)
                              .map((campo) => (
                                <div key={campo.id} className={campo.largura === "full" ? "col-span-2" : ""}>
                                  <DynamicField
                                    field={campo}
                                    value={camposCustomizados[campo.nome_campo]}
                                    onChange={(value) => handleCustomFieldChange(campo.nome_campo, value)}
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="notas" className="mt-0 px-6 py-4">
                      <h3 className="text-sm font-medium mb-4">Notas</h3>
                      <Textarea placeholder="Adicione uma nota..." rows={4} className="mb-4" />
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <p>Nenhuma nota registrada</p>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </div>
            </div>

            {/* Footer com botão salvar */}
            {hasChanges && (
              <div className="px-6 py-3 border-t bg-card flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (oportunidade) {
                      setFormData({
                        nome_oportunidade: oportunidade.nome_oportunidade,
                        valor: oportunidade.valor,
                        data_fechamento_prevista: oportunidade.data_fechamento_prevista,
                        observacoes: oportunidade.observacoes,
                      });
                      setCamposCustomizados((oportunidade.campos_customizados as Record<string, unknown>) || {});
                      setHasChanges(false);
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Oportunidade não encontrada</p>
          </div>
        )}
      </ResizableSheetContent>

      {/* Sheet de inclusão de itens */}
      {oportunidadeId && (
        <ItensOportunidadeSheet
          open={showItensSheet}
          onOpenChange={setShowItensSheet}
          oportunidadeId={oportunidadeId}
          itensExistentes={itensExistentesIds}
          onItensAdicionados={() => {
            // Itens são invalidados automaticamente pelo hook
          }}
        />
      )}

      {/* Dialog de busca de cliente */}
      <ClienteSearchDialog
        open={showClienteSearch}
        onOpenChange={setShowClienteSearch}
        onSelectCliente={handleSelecionarCliente}
      />

      {/* Dialog de edição de item */}
      <EditarItemOportunidadeDialog
        open={showEditarItem}
        onOpenChange={setShowEditarItem}
        item={itemEditando}
        onSave={(itemId, dados) => {
          if (oportunidadeId) {
            atualizarItemMutation.mutate({
              itemId,
              oportunidadeId,
              dados,
            });
          }
        }}
      />
    </Sheet>
  );
}
