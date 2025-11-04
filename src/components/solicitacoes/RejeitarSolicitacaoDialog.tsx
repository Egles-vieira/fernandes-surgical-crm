import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejeitarSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => void;
  isLoading?: boolean;
}

export const RejeitarSolicitacaoDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RejeitarSolicitacaoDialogProps) => {
  const [motivo, setMotivo] = useState("");

  const handleConfirm = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar Solicitação</DialogTitle>
          <DialogDescription>
            Informe o motivo da rejeição desta solicitação de cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Rejeição *</Label>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!motivo.trim() || isLoading}
          >
            Rejeitar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
