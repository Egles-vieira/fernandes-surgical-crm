import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { Loader2, Users, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface DistribuirClientesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (criterio: "equitativa" | "faturamento" | "potencial") => Promise<void>;
  equipeId?: string;
  estatisticas?: {
    clientesSemVendedor: number;
    vendedoresAtivos: number;
  };
}

export function DistribuirClientesDialog({
  open,
  onOpenChange,
  onConfirm,
  equipeId,
  estatisticas,
}: DistribuirClientesDialogProps) {
  const [criterio, setCriterio] = useState<"equitativa" | "faturamento" | "potencial">("equitativa");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(criterio);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao distribuir clientes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribuir Clientes Automaticamente
          </DialogTitle>
          <DialogDescription>
            Distribua clientes sem vendedor entre os membros da equipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {estatisticas && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex gap-4">
                  <span>
                    <strong>{estatisticas.clientesSemVendedor}</strong> clientes sem vendedor
                  </span>
                  <span>
                    <strong>{estatisticas.vendedoresAtivos}</strong> vendedores ativos na equipe
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label>Escolha o critério de distribuição:</Label>
            <RadioGroup value={criterio} onValueChange={(v) => setCriterio(v as any)}>
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="equitativa" id="equitativa" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="equitativa" className="cursor-pointer flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Distribuição Equitativa
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Distribui clientes igualmente entre todos os vendedores, balanceando a quantidade.
                  </p>
                  <Badge variant="secondary" className="mt-2">Recomendado</Badge>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="faturamento" id="faturamento" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="faturamento" className="cursor-pointer flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Por Faturamento Atual
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Atribui mais clientes aos vendedores com menor faturamento atual, equilibrando oportunidades.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="potencial" id="potencial" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="potencial" className="cursor-pointer flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Por Performance
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Prioriza vendedores com melhor performance e atingimento de metas.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta ação irá sobrescrever vendedores já atribuídos se necessário. Clientes com vendedor definido manualmente serão preservados.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Distribuindo...
              </>
            ) : (
              "Distribuir Clientes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
