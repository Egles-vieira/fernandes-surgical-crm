import { useState } from "react";
import { ExternalLink, Mail, Pencil, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useOportunidade } from "@/hooks/pipelines/useOportunidades";
import { usePipelineFields } from "@/hooks/pipelines/usePipelineFields";
import { OportunidadeHeaderInfo } from "./OportunidadeHeaderInfo";
import { OportunidadeFieldsDisplay } from "./OportunidadeFieldsDisplay";
import { OportunidadeFormDialog } from "@/components/pipelines/forms/OportunidadeFormDialog";

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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  // Buscar dados da oportunidade
  const { data: oportunidade, isLoading } = useOportunidade(oportunidadeId);

  // Buscar todos os campos do pipeline (não apenas kanban)
  const { data: allFields } = usePipelineFields({
    pipelineId: pipelineId || "",
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/vendas?oportunidade=${oportunidadeId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência");
  };

  const handleSendEmail = () => {
    if (!oportunidade) return;
    
    const subject = encodeURIComponent(`Oportunidade: ${oportunidade.nome_oportunidade}`);
    const body = encodeURIComponent(
      `Oportunidade: ${oportunidade.nome_oportunidade}\n` +
      `Valor: ${oportunidade.valor ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(oportunidade.valor) : "Não definido"}\n` +
      `Conta: ${oportunidade.conta?.nome_conta || "Não vinculada"}\n\n` +
      `Link: ${window.location.origin}/vendas?oportunidade=${oportunidadeId}`
    );
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const camposCustomizados = (oportunidade?.campos_customizados as Record<string, unknown>) || {};

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : oportunidade ? (
            <>
              {/* Header */}
              <SheetHeader className="px-6 py-4 border-b shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg font-semibold truncate">
                      {oportunidade.nome_oportunidade}
                    </SheetTitle>
                    {oportunidade.codigo && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        #{oportunidade.codigo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowEditDialog(true)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleCopyLink}
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleSendEmail}
                      title="Enviar por email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-6 mt-4 grid w-auto grid-cols-3 shrink-0">
                  <TabsTrigger value="geral">Em geral</TabsTrigger>
                  <TabsTrigger value="atividades">Atividades</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <TabsContent value="geral" className="mt-0 px-6 py-4">
                    {/* Informações básicas */}
                    <OportunidadeHeaderInfo oportunidade={oportunidade} />

                    {/* Campos customizados */}
                    {allFields && allFields.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Campos Customizados
                          </h3>
                          <OportunidadeFieldsDisplay
                            campos={allFields}
                            valores={camposCustomizados}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="atividades" className="mt-0 px-6 py-4">
                    <div className="text-center text-muted-foreground py-8">
                      <p>Funcionalidade de atividades em desenvolvimento</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="documentos" className="mt-0 px-6 py-4">
                    <div className="text-center text-muted-foreground py-8">
                      <p>Funcionalidade de documentos em desenvolvimento</p>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Oportunidade não encontrada</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de edição */}
      {oportunidade && pipelineId && (
        <OportunidadeFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          pipelineId={pipelineId}
          oportunidade={oportunidade}
        />
      )}
    </>
  );
}
