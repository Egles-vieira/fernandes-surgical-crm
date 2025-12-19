import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { OportunidadeForm } from "./OportunidadeForm";
import { OportunidadeFormSheet } from "./OportunidadeFormSheet";
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
  onSuccess?: (oportunidadeId: string) => void;
}

export function OportunidadeFormDialog({
  open,
  onOpenChange,
  pipelineId,
  oportunidade,
  contaId,
  contatoId,
  variant = "dialog",
  onSuccess,
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
        onSuccess?.(oportunidade.id);
      } else {
        const insertData = {
          ...data,
          campos_customizados: data.campos_customizados 
            ? JSON.parse(JSON.stringify(data.campos_customizados)) 
            : null,
        } as any;
        const result = await createMutation.mutateAsync(insertData);
        onSuccess?.(result.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar oportunidade:", error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Para criação com variant="sheet", usar o novo componente completo
  if (variant === "sheet" && !isEditing) {
    return (
      <OportunidadeFormSheet
        open={open}
        onOpenChange={onOpenChange}
        pipelineId={pipelineId}
        contaId={contaId}
        contatoId={contatoId}
        onSuccess={onSuccess}
      />
    );
  }

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
