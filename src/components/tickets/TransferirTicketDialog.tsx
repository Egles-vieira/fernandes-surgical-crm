import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTicketActions } from "@/hooks/useTicketActions";

interface TransferirTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumero: string;
}

export function TransferirTicketDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumero,
}: TransferirTicketDialogProps) {
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [motivo, setMotivo] = useState("");
  const { usuarios, transferirTicket } = useTicketActions();

  const handleTransferir = async () => {
    if (!novoResponsavel) return;

    await transferirTicket.mutateAsync({
      ticketId,
      novoResponsavel,
      motivo,
    });

    onOpenChange(false);
    setNovoResponsavel("");
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir Atendimento</DialogTitle>
          <DialogDescription>
            Ticket {ticketNumero} - Transferir para outro atendente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Novo Responsável *</Label>
            <Select value={novoResponsavel} onValueChange={setNovoResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um atendente" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo da Transferência (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente solicitou falar com gerente, necessita expertise específica..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransferir}
              disabled={!novoResponsavel || transferirTicket.isPending}
            >
              {transferirTicket.isPending ? "Transferindo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
