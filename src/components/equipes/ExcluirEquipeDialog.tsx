import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface ExcluirEquipeDialogProps {
  equipe: {
    id: string;
    nome: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (equipeId: string) => Promise<void>;
}

export function ExcluirEquipeDialog({
  equipe,
  open,
  onOpenChange,
  onConfirm,
}: ExcluirEquipeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!equipe) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(equipe.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao excluir equipe:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!equipe) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Excluir Equipe Permanentemente</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a <strong>excluir permanentemente</strong> a equipe{" "}
              <strong>{equipe.nome}</strong>.
            </p>
            <p className="text-destructive font-semibold">
              Esta ação NÃO PODE ser desfeita. Todos os dados da equipe serão perdidos.
            </p>
            <p>
              Certifique-se de que não há membros ativos ou metas vinculadas a esta equipe antes de prosseguir.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
