import { useState, useEffect, useRef } from "react";
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
  Check
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useOportunidade, useUpdateOportunidade } from "@/hooks/pipelines/useOportunidades";
import { usePipelineFields } from "@/hooks/pipelines/usePipelineFields";
import { usePipelineComEstagios } from "@/hooks/pipelines/usePipelines";
import { DynamicField } from "@/components/pipelines/fields/DynamicField";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState("atividades");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [camposCustomizados, setCamposCustomizados] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sheetWidth, setSheetWidth] = useState(1200);
  const isResizing = useRef(false);

  // Resize handlers usando useEffect para cleanup adequado
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setSheetWidth(Math.min(Math.max(newWidth, 600), window.innerWidth - 100));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
  };

  // Buscar dados da oportunidade
  const { data: oportunidade, isLoading } = useOportunidade(oportunidadeId);
  
  // Buscar pipeline com estágios
  const { estagios } = usePipelineComEstagios(pipelineId);

  // Buscar todos os campos do pipeline
  const { data: allFields } = usePipelineFields({
    pipelineId: pipelineId || "",
  });

  // Mutation para atualizar
  const updateMutation = useUpdateOportunidade();

  // Sincronizar dados quando oportunidade carregar
  useEffect(() => {
    if (oportunidade) {
      setFormData({
        nome_oportunidade: oportunidade.nome_oportunidade,
        valor: oportunidade.valor,
        data_fechamento: oportunidade.data_fechamento_prevista,
        observacoes: oportunidade.observacoes,
      });
      setCamposCustomizados((oportunidade.campos_customizados as Record<string, unknown>) || {});
      setHasChanges(false);
    }
  }, [oportunidade]);

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldChange = (field: string, value: unknown) => {
    setCamposCustomizados(prev => ({ ...prev, [field]: value }));
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
  const camposAgrupados = allFields?.reduce((acc, campo) => {
    const grupo = campo.grupo || "Outros";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(campo);
    return acc;
  }, {} as Record<string, typeof allFields>) || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="!w-auto sm:!max-w-none p-0 flex flex-col gap-0"
        side="right"
        style={{ width: sheetWidth, maxWidth: '95vw' }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-50"
          onMouseDown={handleMouseDown}
        />
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : oportunidade ? (
          <>
            {/* Header com título e código */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">
                  {oportunidade.codigo ? `Oportunidade #${oportunidade.codigo}` : "Oportunidade"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar Link
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conteúdo principal - duas colunas */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Coluna esquerda - Dados principais */}
              <div className="w-[380px] border-r flex flex-col bg-background">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Badge de status */}
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Cliente Ativo
                    </Badge>

                    {/* Nome e código */}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Oportunidade #{oportunidade.codigo || oportunidade.id.slice(0, 8)}
                      </p>
                      <h2 className="text-lg font-bold mt-1">
                        {oportunidade.conta?.nome_conta || oportunidade.nome_oportunidade}
                      </h2>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <Separator />

                    {/* Valor */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Proposta</span>
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                          Ver
                        </Button>
                      </div>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(oportunidade.valor)}
                      </div>
                    </div>

                    <Separator />

                    {/* Detalhes do Cliente */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Detalhes do Cliente</h3>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {(oportunidade.conta?.nome_conta || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {oportunidade.conta?.nome_conta || "Sem conta vinculada"}
                          </p>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{(oportunidade.contato as any)?.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{(oportunidade.contato as any)?.telefone || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Vendedor */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Vendedor</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Vendedor Responsável</span>
                      </div>
                      <p className="text-sm">—</p>
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
              <div className="flex-1 flex flex-col min-w-0">
                {/* Header da coluna direita */}
                <div className="px-6 py-4 border-b space-y-4">
                  {/* Pipeline e estágio */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Pipeline:</span>
                      <span className="font-medium">{oportunidade.pipeline?.nome || "—"}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Etapa:</span>
                      <span className="font-medium">{oportunidade.estagio?.nome_estagio || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(oportunidade.criado_em)}
                    </div>
                  </div>

                  {/* Navegação de estágios - Stepper com setas */}
                  <div className="flex overflow-x-auto">
                    {estagios?.map((estagio, index) => {
                      const currentIndex = estagios.findIndex(e => e.id === oportunidade.estagio_id);
                      const isCompleted = index < currentIndex;
                      const isCurrent = estagio.id === oportunidade.estagio_id;
                      const isFuture = index > currentIndex;
                      const isLast = index === estagios.length - 1;

                      return (
                        <div key={estagio.id} className="flex items-center">
                          <div
                            className={cn(
                              "relative flex items-center gap-1.5 px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
                              isCompleted && "bg-emerald-600 text-white",
                              isCurrent && "bg-blue-600 text-white",
                              isFuture && "bg-muted text-muted-foreground",
                              !isLast && "pr-6"
                            )}
                            style={{
                              clipPath: isLast 
                                ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)"
                                : "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)",
                              marginLeft: index === 0 ? 0 : "-8px"
                            }}
                          >
                            {isCompleted && <Check className="h-3 w-3" />}
                            <span>{estagio.nome_estagio}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-6 mt-4 justify-start bg-transparent border-b rounded-none h-auto p-0 gap-4">
                    <TabsTrigger 
                      value="atividades" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                    >
                      Atividades
                    </TabsTrigger>
                    <TabsTrigger 
                      value="campos" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                    >
                      Campos
                      {allFields && allFields.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {allFields.length}
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
                    <TabsContent value="atividades" className="mt-0 px-6 py-4">
                      <h3 className="text-sm font-medium mb-4">Últimas Atividades</h3>
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Calendar className="h-12 w-12 mb-4 opacity-50" />
                        <p>Nenhuma atividade registrada</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="campos" className="mt-0 px-6 py-4 space-y-6">
                      {/* Campos básicos */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Informações Básicas</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label>Nome da Oportunidade</Label>
                            <Input
                              value={formData.nome_oportunidade as string || ""}
                              onChange={(e) => handleFieldChange("nome_oportunidade", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Valor</Label>
                            <Input
                              type="number"
                              value={formData.valor as number || ""}
                              onChange={(e) => handleFieldChange("valor", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Data de Fechamento</Label>
                            <Input
                              type="date"
                              value={formData.data_fechamento as string || ""}
                              onChange={(e) => handleFieldChange("data_fechamento", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                              value={formData.observacoes as string || ""}
                              onChange={(e) => handleFieldChange("observacoes", e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Campos customizados por grupo */}
                      {Object.entries(camposAgrupados).map(([grupo, campos]) => (
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
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="notas" className="mt-0 px-6 py-4">
                      <h3 className="text-sm font-medium mb-4">Notas</h3>
                      <Textarea
                        placeholder="Adicione uma nota..."
                        rows={4}
                        className="mb-4"
                      />
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
              <div className="px-6 py-3 border-t bg-muted/30 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (oportunidade) {
                      setFormData({
                        nome_oportunidade: oportunidade.nome_oportunidade,
                        valor: oportunidade.valor,
                        data_fechamento: oportunidade.data_fechamento_prevista,
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
      </SheetContent>
    </Sheet>
  );
}
