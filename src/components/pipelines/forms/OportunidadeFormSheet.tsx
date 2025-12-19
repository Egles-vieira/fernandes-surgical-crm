import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet } from "@/components/ui/sheet";
import { ResizableSheetContent } from "@/components/ui/resizable-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetTitle } from "@/components/ui/sheet";
import { PipelineStagesBar } from "../details/PipelineStagesBar";
import { DynamicFieldGroup } from "../fields/DynamicFieldGroup";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { useEstagiosPipeline, usePipeline } from "@/hooks/pipelines/usePipelines";
import { usePipelineFields, validateAllFields } from "@/hooks/pipelines/usePipelineFields";
import { useCreateOportunidade } from "@/hooks/pipelines/useOportunidades";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, User, Building2, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Json } from "@/integrations/supabase/types";

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
  const [contaId, setContaId] = useState<string | null>(initialContaId || null);
  const [contaNome, setContaNome] = useState<string>("");
  const [contatoId, setContatoId] = useState<string | null>(initialContatoId || null);
  const [contatoNome, setContatoNome] = useState<string>("");
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [camposCustomizados, setCamposCustomizados] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dataFechamento, setDataFechamento] = useState<Date | undefined>(undefined);

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
      setContaId(initialContaId || null);
      setContaNome("");
      setContatoId(initialContatoId || null);
      setContatoNome("");
      setCamposCustomizados({});
      setFieldErrors({});
      setDataFechamento(undefined);
    }
  }, [open, form, initialContaId, initialContatoId]);

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

  const handleClienteSelect = (cliente: { id: string; nome_emit?: string; nome_fantasia?: string }) => {
    setContaId(cliente.id);
    setContaNome(cliente.nome_fantasia || cliente.nome_emit || "");
    setShowClienteSearch(false);
  };

  const handleSubmit = async (data: FormData) => {
    // Validar campos customizados obrigatórios
    const camposObrigatorios = customFields.filter((f) => f.obrigatorio);
    const { valido, erros } = validateAllFields(camposObrigatorios, camposCustomizados);

    if (!valido) {
      setFieldErrors(erros);
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
      data_fechamento_prevista: dataFechamento ? format(dataFechamento, "yyyy-MM-dd") : null,
      observacoes: data.observacoes,
      conta_id: contaId,
      contato_id: contatoId,
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

  const isLoading = isLoadingPipeline || isLoadingEstagios;
  const estagiosOrdenados = [...estagios].sort((a, b) => a.ordem_estagio - b.ordem_estagio);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        defaultWidth={900}
        minWidth={600}
        maxWidth={1200}
        storageKey="oportunidade-form-sheet-width"
        className="p-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-lg font-semibold">
              Nova Oportunidade
            </SheetTitle>
            {pipeline && (
              <span className="text-sm text-muted-foreground">
                • {pipeline.nome}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Barra de estágios */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Etapa inicial:</span>
              </div>
              <PipelineStagesBar
                estagios={estagiosOrdenados}
                estagioAtualId={estagioSelecionado}
                onEstagioClick={setEstagioSelecionado}
              />
            </div>

            {/* Conteúdo principal */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Seção: Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Informações Básicas
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Nome da oportunidade */}
                    <div className="col-span-2 space-y-2">
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

                    {/* Valor estimado */}
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor Estimado</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...form.register("valor", {
                          setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                        })}
                      />
                    </div>

                    {/* Data de fechamento */}
                    <div className="space-y-2">
                      <Label>Data Prevista de Fechamento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dataFechamento && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dataFechamento
                              ? format(dataFechamento, "dd/MM/yyyy", { locale: ptBR })
                              : "Selecione uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dataFechamento}
                            onSelect={setDataFechamento}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção: Cliente e Contato */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Cliente e Contato
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Conta/Cliente */}
                    <div className="space-y-2">
                      <Label>Conta/Empresa</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowClienteSearch(true)}
                      >
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        {contaNome || "Selecionar conta..."}
                      </Button>
                    </div>

                    {/* Contato */}
                    <div className="space-y-2">
                      <Label>Contato Principal</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowClienteSearch(true)}
                      >
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {contatoNome || "Selecionar contato..."}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção: Observações */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Observações
                  </h3>
                  <Textarea
                    placeholder="Adicione observações sobre esta oportunidade..."
                    className="min-h-[100px]"
                    {...form.register("observacoes")}
                  />
                </div>

                {/* Seção: Campos Customizados */}
                {customFields.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Campos Adicionais
                      </h3>
                      <DynamicFieldGroup
                        fields={customFields}
                        values={camposCustomizados}
                        onChange={handleCustomFieldChange}
                        errors={fieldErrors}
                        columns={2}
                      />
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Footer com botões */}
            <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
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
