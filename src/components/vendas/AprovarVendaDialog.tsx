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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface AprovarVendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  vendaNumero: string;
  vendaValor: number;
  isLoading?: boolean;
}

export function AprovarVendaDialog({
  open,
  onOpenChange,
  onConfirm,
  vendaNumero,
  vendaValor,
  isLoading
}: AprovarVendaDialogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Aprovar Venda
          </DialogTitle>
          <DialogDescription>
            Confirme a aprovação da venda abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ao aprovar, esta venda será contabilizada nas metas da equipe e não poderá ser revertida.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Número da Venda:</span>
              <span className="font-semibold">{vendaNumero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total:</span>
              <span className="font-semibold text-success">{formatCurrency(vendaValor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Novo Status:</span>
              <span className="font-semibold text-success">Concluída</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-success hover:bg-success/90"
          >
            {isLoading ? "Aprovando..." : "Confirmar Aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
