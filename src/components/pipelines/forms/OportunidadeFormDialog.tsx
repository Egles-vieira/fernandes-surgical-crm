import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { OportunidadeForm } from "./OportunidadeForm";
import { useCreateOportunidade, useUpdateOportunidade } from "@/hooks/pipelines/useOportunidades";
import { usePipeline } from "@/hooks/pipelines/usePipelines";
import { Oportunidade, OportunidadeInsert, OportunidadeUpdate } from "@/types/pipelines";

interface OportunidadeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  oportunidade?: Oportunidade | null;
  contaId?: string | null;
  contatoId?: string | null;
  variant?: "dialog" | "sheet";
}

export function OportunidadeFormDialog({
  open,
  onOpenChange,
  pipelineId,
  oportunidade,
  contaId,
  contatoId,
  variant = "dialog",
}: OportunidadeFormDialogProps) {
  const isEditing = !!oportunidade;
  
  const { data: pipeline } = usePipeline(pipelineId);
  const createMutation = useCreateOportunidade();
  const updateMutation = useUpdateOportunidade();
  
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (data: OportunidadeInsert | OportunidadeUpdate) => {
    try {
      if (isEditing && oportunidade) {
        const { pipeline_id, ...updateData } = data as any;
        await updateMutation.mutateAsync({
          id: oportunidade.id,
          dados: updateData,
        });
      } else {
        const insertData = {
          ...data,
          campos_customizados: data.campos_customizados 
            ? JSON.parse(JSON.stringify(data.campos_customizados)) 
            : null,
        } as any;
        await createMutation.mutateAsync(insertData);
      }
      onOpenChange(false);
    } catch (error) {
      // Erro já tratado no hook
      console.error("Erro ao salvar oportunidade:", error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const title = isEditing 
    ? `Editar Oportunidade` 
    : `Nova Oportunidade${pipeline?.nome ? ` - ${pipeline.nome}` : ""}`;
  
  const description = isEditing
    ? "Atualize os dados da oportunidade"
    : "Preencha os dados para criar uma nova oportunidade";

  const content = (
    <OportunidadeForm
      pipelineId={pipelineId}
      oportunidade={oportunidade}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
      contaId={contaId}
      contatoId={contatoId}
    />
  );

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl w-full p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="px-6 py-4">
              {content}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
