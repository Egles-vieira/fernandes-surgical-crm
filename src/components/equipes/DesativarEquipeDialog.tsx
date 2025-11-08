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
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";

interface DesativarEquipeDialogProps {
  equipe: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo?: string) => Promise<void>;
  acao: "desativar" | "reativar";
}

export function DesativarEquipeDialog({
  equipe,
  open,
  onOpenChange,
  onConfirm,
  acao,
}: DesativarEquipeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motivo, setMotivo] = useState("");

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(acao === "desativar" ? motivo : undefined);
      onOpenChange(false);
      setMotivo("");
    } catch (error) {
      console.error(`Erro ao ${acao} equipe:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDesativar = acao === "desativar";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isDesativar ? (
              <AlertTriangle className="h-6 w-6 text-warning" />
            ) : (
              <CheckCircle className="h-6 w-6 text-success" />
            )}
            <AlertDialogTitle>
              {isDesativar ? "Desativar" : "Reativar"} Equipe
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {isDesativar ? (
              <>
                Tem certeza que deseja desativar a equipe <strong>{equipe?.nome}</strong>?
                <br />
                <br />
                Os membros não serão removidos, mas a equipe ficará inativa e não
                aparecerá nas listagens principais.
              </>
            ) : (
              <>
                Tem certeza que deseja reativar a equipe <strong>{equipe?.nome}</strong>?
                <br />
                <br />
                A equipe voltará a aparecer nas listagens e poderá ser utilizada
                normalmente.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isDesativar && (
          <div className="space-y-2 py-4">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo da desativação..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant={isDesativar ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDesativar ? "Desativar Equipe" : "Reativar Equipe"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
