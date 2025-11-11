import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

interface NovaMetaVendedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedorId: string;
  equipeId?: string;
  onCriar: (meta: any) => void;
}

export function NovaMetaVendedorDialog({
  open,
  onOpenChange,
  vendedorId,
  equipeId,
  onCriar,
}: NovaMetaVendedorDialogProps) {
  const [metaValor, setMetaValor] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  const resetForm = () => {
    setMetaValor("");
    setPeriodoInicio("");
    setPeriodoFim("");
  };

  const handleSubmit = () => {
    if (!metaValor || !periodoInicio || !periodoFim) {
      return;
    }

    onCriar({
      vendedor_id: vendedorId,
      equipe_id: equipeId,
      periodo_inicio: new Date(periodoInicio).toISOString(),
      periodo_fim: new Date(periodoFim).toISOString(),
      meta_valor: parseFloat(metaValor),
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Definir Meta Individual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Meta de Valor (R$)*</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={metaValor}
              onChange={(e) => setMetaValor(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inicio">Período Início*</Label>
              <Input
                id="inicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fim">Período Fim*</Label>
              <Input
                id="fim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
