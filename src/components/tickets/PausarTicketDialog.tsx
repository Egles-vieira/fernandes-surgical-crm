import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTicketActions } from "@/hooks/useTicketActions";

interface PausarTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumero: string;
}

export function PausarTicketDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumero,
}: PausarTicketDialogProps) {
  const [motivo, setMotivo] = useState("");
  const { pausarTicket } = useTicketActions();

  const handlePausar = async () => {
    if (!motivo.trim()) return;

    await pausarTicket.mutateAsync({
      ticketId,
      motivo,
    });

    onOpenChange(false);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pausar Atendimento</DialogTitle>
          <DialogDescription>
            Ticket {ticketNumero} - Informe o motivo da pausa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo da Pausa *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Aguardando retorno do cliente, consultando informações, almoço..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePausar}
              disabled={!motivo.trim() || pausarTicket.isPending}
            >
              {pausarTicket.isPending ? "Pausando..." : "Pausar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
