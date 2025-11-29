import { useState, useMemo } from "react";
import { Truck, Clock, Loader2, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface TransportadoraOption {
  cod_transp: number;
  nome_transp: string;
  vl_tot_frete: number;
  prazo_entrega: number;
  vl_tde: number;
  bloqueio: string;
  orig?: boolean;
}

interface SelecionarFreteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transportadoras: TransportadoraOption[];
  onSelect: (transportadora: TransportadoraOption) => void;
  isConfirming?: boolean;
}

// Formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
};

// Formatar prazo de entrega
const formatPrazo = (dias: number) => {
  if (dias === 0) return "Entrega imediata";
  if (dias === 1) return "1 dia útil";
  return `${dias} dias úteis`;
};

export function SelecionarFreteDialog({
  open,
  onOpenChange,
  transportadoras,
  onSelect,
  isConfirming = false,
}: SelecionarFreteDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"preco" | "prazo">("preco");

  // Identificar mais barato e mais rápido
  const { maisBarato, maisRapido, sortedTransportadoras } = useMemo(() => {
    if (transportadoras.length === 0) {
      return { maisBarato: null, maisRapido: null, sortedTransportadoras: [] };
    }

    const maisBarato = transportadoras.reduce((min, t) =>
      t.vl_tot_frete < min.vl_tot_frete ? t : min
    );

    const maisRapido = transportadoras.reduce((min, t) =>
      t.prazo_entrega < min.prazo_entrega ? t : min
    );

    const sorted = [...transportadoras].sort((a, b) => {
      if (sortBy === "preco") {
        return a.vl_tot_frete - b.vl_tot_frete;
      }
      return a.prazo_entrega - b.prazo_entrega;
    });

    return { maisBarato, maisRapido, sortedTransportadoras: sorted };
  }, [transportadoras, sortBy]);

  const selectedTransportadora = useMemo(() => {
    if (!selectedId) return null;
    return transportadoras.find((t) => t.cod_transp.toString() === selectedId);
  }, [selectedId, transportadoras]);

  const handleConfirm = () => {
    if (selectedTransportadora) {
      onSelect(selectedTransportadora);
    }
  };

  const toggleSort = () => {
    setSortBy((prev) => (prev === "preco" ? "prazo" : "preco"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Selecionar Transportadora
          </DialogTitle>
          <DialogDescription>
            Encontramos {transportadoras.length} opção(ões) de frete para esta entrega.
            Selecione a transportadora desejada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">
            Ordenar por: <span className="font-medium">{sortBy === "preco" ? "Preço" : "Prazo"}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={toggleSort} className="gap-1">
            <ArrowUpDown className="h-4 w-4" />
            Alternar
          </Button>
        </div>

        <ScrollArea className="max-h-[400px]">
          <RadioGroup
            value={selectedId || ""}
            onValueChange={setSelectedId}
            className="space-y-0"
          >
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_140px_100px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
              <span>Transportadora</span>
              <span className="text-center">Prazo</span>
              <span className="text-right">Valor Frete</span>
              <span className="text-center">Status</span>
            </div>

            {sortedTransportadoras.map((transportadora, index) => {
              const isMaisBarato = maisBarato?.cod_transp === transportadora.cod_transp;
              const isMaisRapido = maisRapido?.cod_transp === transportadora.cod_transp && 
                                   transportadora.prazo_entrega === 0;
              const hasBloqueio = transportadora.bloqueio && transportadora.bloqueio.trim() !== "";
              const isSelected = selectedId === transportadora.cod_transp.toString();

              return (
                <div
                  key={transportadora.cod_transp}
                  className={cn(
                    "grid grid-cols-[1fr_120px_140px_100px] gap-4 items-center px-4 py-3 transition-all cursor-pointer border-b border-border/50",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-muted/50",
                    hasBloqueio && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !hasBloqueio && setSelectedId(transportadora.cod_transp.toString())}
                >
                  {/* Transportadora */}
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value={transportadora.cod_transp.toString()}
                      id={`transp-${transportadora.cod_transp}`}
                      disabled={hasBloqueio}
                    />
                    <Label
                      htmlFor={`transp-${transportadora.cod_transp}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {index + 1}º {transportadora.nome_transp}
                    </Label>
                  </div>

                  {/* Prazo */}
                  <div className="text-center text-sm text-muted-foreground">
                    {formatPrazo(transportadora.prazo_entrega)}
                  </div>

                  {/* Valor */}
                  <div className="text-right">
                    <span className={cn(
                      "font-bold text-sm",
                      isMaisBarato ? "text-primary" : "text-foreground"
                    )}>
                      {formatCurrency(transportadora.vl_tot_frete)}
                    </span>
                  </div>

                  {/* Status/Badges */}
                  <div className="flex justify-center">
                    {isMaisBarato && (
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                        Menor
                      </Badge>
                    )}
                    {isMaisRapido && !isMaisBarato && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Rápido
                      </Badge>
                    )}
                    {hasBloqueio && (
                      <Badge variant="destructive" className="text-xs">
                        Bloqueado
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTransportadora || isConfirming}
            className="min-w-[160px]"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirmando...
              </>
            ) : (
              "Confirmar Seleção"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
