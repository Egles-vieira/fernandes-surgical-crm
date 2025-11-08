import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface RemoverMembroDialogProps {
  membro: any;
  equipe: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => Promise<void>;
}

export function RemoverMembroDialog({
  membro,
  equipe,
  open,
  onOpenChange,
  onConfirm,
}: RemoverMembroDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motivo, setMotivo] = useState("");

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(motivo);
      onOpenChange(false);
      setMotivo("");
    } catch (error) {
      console.error("Erro ao remover membro:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <AlertDialogTitle>Remover Membro da Equipe</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Tem certeza que deseja remover este membro da equipe <strong>{equipe?.nome}</strong>?
            <br />
            <br />
            O histórico será mantido e esta ação pode ser útil para relatórios de turnover.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="motivo">Motivo da Remoção*</Label>
          <Textarea
            id="motivo"
            placeholder="Descreva o motivo da remoção..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !motivo.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remover Membro
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
