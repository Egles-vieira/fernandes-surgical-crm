import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet } from "@/components/ui/sheet";
import { ResizableSheetContent } from "@/components/ui/resizable-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SheetTitle } from "@/components/ui/sheet";
import { PipelineStagesBar } from "../details/PipelineStagesBar";
import { DynamicField } from "../fields/DynamicField";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { useEstagiosPipeline, usePipeline } from "@/hooks/pipelines/usePipelines";
import { usePipelineFields, validateAllFields } from "@/hooks/pipelines/usePipelineFields";
import { useCreateOportunidade } from "@/hooks/pipelines/useOportunidades";
import { useContatosCliente } from "@/hooks/useContatosCliente";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  X, 
  User, 
  Building2, 
  Loader2, 
  Save, 
  Search, 
  Mail, 
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Json, Tables } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes">;

const formSchema = z.object({
  nome_oportunidade: z.string().min(1, "Nome é obrigatório"),
  valor: z.number().nullable().optional(),
  data_fechamento_prevista: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface OportunidadeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  contaId?: string | null;
  contatoId?: string | null;
}

export function OportunidadeFormSheet({
  open,
  onOpenChange,
  pipelineId,
  contaId: initialContaId,
  contatoId: initialContatoId,
}: OportunidadeFormSheetProps) {
  const { data: pipeline, isLoading: isLoadingPipeline } = usePipeline(pipelineId);
  const { data: estagios = [], isLoading: isLoadingEstagios } = useEstagiosPipeline(pipelineId);
  const { data: customFields = [] } = usePipelineFields({ pipelineId });
  const createMutation = useCreateOportunidade();

  const [estagioSelecionado, setEstagioSelecionado] = useState<string | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [contatoSelecionadoId, setContatoSelecionadoId] = useState<string | null>(initialContatoId || null);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [camposCustomizados, setCamposCustomizados] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("campos");

  // Buscar contatos do cliente selecionado
  const { contatos: contatosCliente } = useContatosCliente(clienteSelecionado?.id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_oportunidade: "",
      valor: null,
      data_fechamento_prevista: null,
      observacoes: null,
    },
  });

  // Define estágio inicial quando carregar
  useEffect(() => {
    if (estagios.length > 0 && !estagioSelecionado) {
      const primeiroEstagio = estagios.sort((a, b) => a.ordem_estagio - b.ordem_estagio)[0];
      setEstagioSelecionado(primeiroEstagio.id);
    }
  }, [estagios, estagioSelecionado]);

  // Reset form quando fechar
  useEffect(() => {
    if (!open) {
      form.reset();
      setEstagioSelecionado(null);
      setClienteSelecionado(null);
      setContatoSelecionadoId(initialContatoId || null);
      setCamposCustomizados({});
      setFieldErrors({});
    }
  }, [open, form, initialContatoId]);

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCamposCustomizados((prev) => ({ ...prev, [fieldName]: value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleClienteSelect = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setContatoSelecionadoId(null);
    setShowClienteSearch(false);
  };

  const handleContatoSelect = (contatoId: string | null) => {
    setContatoSelecionadoId(contatoId === contatoSelecionadoId ? null : contatoId);
  };

  const handleSubmit = async (data: FormData) => {
    // Validar campos customizados obrigatórios
    const camposObrigatorios = customFields.filter((f) => f.obrigatorio);
    const { valido, erros } = validateAllFields(camposObrigatorios, camposCustomizados);

    if (!valido) {
      setFieldErrors(erros);
      setActiveTab("campos");
      return;
    }

    if (!estagioSelecionado) {
      return;
    }

    const insertData = {
      pipeline_id: pipelineId,
      estagio_id: estagioSelecionado,
      nome_oportunidade: data.nome_oportunidade,
      valor: data.valor,
      data_fechamento_prevista: data.data_fechamento_prevista,
      observacoes: data.observacoes,
      cliente_id: clienteSelecionado?.id || null,
      cliente_nome: clienteSelecionado?.nome_emit || null,
      cliente_cnpj: clienteSelecionado?.cgc || null,
      vendedor_id: clienteSelecionado?.vendedor_id || null,
      contato_id: contatoSelecionadoId,
      campos_customizados: Object.keys(camposCustomizados).length > 0 
        ? camposCustomizados as unknown as Json 
        : null,
    };

    try {
      await createMutation.mutateAsync(insertData);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar oportunidade:", error);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Agrupar campos por grupo
  const camposAgrupados = useMemo(() => {
    return customFields.reduce((acc, campo) => {
      const grupo = campo.grupo || "Outros";
      if (!acc[grupo]) acc[grupo] = [];
      acc[grupo].push(campo);
      return acc;
    }, {} as Record<string, typeof customFields>);
  }, [customFields]);

  const isLoading = isLoadingPipeline || isLoadingEstagios;
  const estagiosOrdenados = [...estagios].sort((a, b) => a.ordem_estagio - b.ordem_estagio);
  const estagioAtual = estagiosOrdenados.find(e => e.id === estagioSelecionado);
  const valorAtual = form.watch("valor");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        defaultWidth={900}
        minWidth={600}
        maxWidth={1400}
        storageKey="oportunidade-form-sheet-width"
        className="p-0 flex flex-col gap-0"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-lg font-semibold">
                  Nova Oportunidade
                </SheetTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Conteúdo principal - duas colunas */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {/* Botão de colapsar painel lateral */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-6 rounded-l-none rounded-r-md bg-muted/80 hover:bg-muted border border-l-0"
                style={{ left: isLeftPanelExpanded ? '340px' : '0' }}
                onClick={() => setIsLeftPanelExpanded(!isLeftPanelExpanded)}
              >
                {isLeftPanelExpanded ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {/* Coluna esquerda - Dados principais */}
              <div className={cn(
                "border-r flex flex-col bg-background transition-all duration-300",
                isLeftPanelExpanded ? "w-[340px]" : "w-0 overflow-hidden"
              )}>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Badge de status */}
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Rascunho
                    </Badge>

                    {/* Nome da oportunidade */}
                    <div className="space-y-2">
                      <Label htmlFor="nome_oportunidade">
                        Nome da Oportunidade <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="nome_oportunidade"
                        placeholder="Ex: Proposta comercial - Cliente X"
                        {...form.register("nome_oportunidade")}
                      />
                      {form.formState.errors.nome_oportunidade && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.nome_oportunidade.message}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Valor */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Valor Estimado</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="text-2xl font-bold h-auto py-2 border-0 bg-transparent p-0 focus-visible:ring-0"
                        {...form.register("valor", {
                          setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                        })}
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(valorAtual)}
                      </div>
                    </div>

                    <Separator />

                    {/* Cliente Vinculado */}
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
                              <p className="text-sm font-medium truncate">
                                {clienteSelecionado.nome_emit}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {clienteSelecionado.cgc}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{clienteSelecionado.e_mail || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{clienteSelecionado.telefone1 || "—"}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 border border-dashed rounded-lg text-center">
                          <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum cliente vinculado
                          </p>
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

                    {/* Contatos do Cliente */}
                    {clienteSelecionado && contatosCliente.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium">Contato do Cliente</h3>
                          <div className="space-y-2">
                            {contatosCliente.map((contato) => (
                              <div 
                                key={contato.id}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                  contatoSelecionadoId === contato.id 
                                    ? "bg-primary/10 border border-primary/20" 
                                    : "hover:bg-muted/50"
                                )}
                                onClick={() => handleContatoSelect(contato.id)}
                              >
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                  {contato.primeiro_nome.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {contato.nome_completo}
                                  </p>
                                  {contato.cargo && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {contato.cargo}
                                    </p>
                                  )}
                                </div>
                                {contatoSelecionadoId === contato.id && (
                                  <Badge variant="secondary" className="text-xs">
                                    Selecionado
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Vendedor */}
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Vendedor</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {clienteSelecionado?.vendedor_id 
                            ? "Vendedor do cliente" 
                            : "Será definido automaticamente"}
                        </span>
                      </div>
                    </div>

                    {/* Data de fechamento */}
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Data Prevista de Fechamento</h3>
                      <Input
                        type="date"
                        {...form.register("data_fechamento_prevista")}
                        className="w-full"
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Coluna direita - Pipeline e abas */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Header da coluna direita */}
                <div className="px-6 py-4 border-b space-y-4">
                  {/* Pipeline e estágio */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Pipeline:</span>
                      <span className="font-medium">{pipeline?.nome || "—"}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Etapa inicial:</span>
                      <span className="font-medium">{estagioAtual?.nome_estagio || "—"}</span>
                    </div>
                  </div>

                  {/* Navegação de estágios */}
                  <PipelineStagesBar
                    estagios={estagiosOrdenados}
                    estagioAtualId={estagioSelecionado}
                    onEstagioClick={setEstagioSelecionado}
                  />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-6 mt-4 justify-start bg-transparent border-b rounded-none h-auto p-0 gap-4">
                    <TabsTrigger 
                      value="itens" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                      disabled
                    >
                      Itens
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 opacity-50">
                        0
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="campos" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                    >
                      Campos
                      {customFields.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {customFields.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="notas" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                    >
                      Notas
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    <TabsContent value="itens" className="mt-0 px-6 py-4">
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">Salve a oportunidade primeiro</p>
                        <p className="text-xs mt-1">Depois você poderá adicionar itens</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="campos" className="mt-0 px-6 py-4 space-y-6">
                      {/* Campos customizados por grupo */}
                      {Object.keys(camposAgrupados).length > 0 ? (
                        Object.entries(camposAgrupados).map(([grupo, campos]) => (
                          <div key={grupo} className="space-y-4">
                            <h3 className="text-sm font-medium">{grupo}</h3>
                            <div className="grid grid-cols-2 gap-4">
                              {campos?.sort((a, b) => a.ordem - b.ordem).map((campo) => (
                                <div 
                                  key={campo.id} 
                                  className={campo.largura === "full" ? "col-span-2" : ""}
                                >
                                  <DynamicField
                                    field={campo}
                                    value={camposCustomizados[campo.nome_campo]}
                                    onChange={(value) => handleCustomFieldChange(campo.nome_campo, value)}
                                    error={fieldErrors[campo.nome_campo]}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <p className="text-sm">Nenhum campo customizado</p>
                          <p className="text-xs mt-1">Configure campos no pipeline para exibi-los aqui</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notas" className="mt-0 px-6 py-4">
                      <h3 className="text-sm font-medium mb-4">Observações</h3>
                      <Textarea
                        placeholder="Adicione observações sobre esta oportunidade..."
                        rows={6}
                        {...form.register("observacoes")}
                      />
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </div>
            </div>

            {/* Footer com botões */}
            <div className="px-6 py-3 border-t bg-muted/30 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Criar Oportunidade
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Dialog de busca de cliente */}
        <ClienteSearchDialog
          open={showClienteSearch}
          onOpenChange={setShowClienteSearch}
          onSelectCliente={handleClienteSelect}
        />
      </ResizableSheetContent>
    </Sheet>
  );
}
