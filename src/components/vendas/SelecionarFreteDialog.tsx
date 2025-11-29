import { useState, useMemo } from "react";
import { Truck, Clock, BadgeCheck, AlertTriangle, Loader2, ArrowUpDown } from "lucide-react";
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

        <ScrollArea className="max-h-[400px] pr-4">
          <RadioGroup
            value={selectedId || ""}
            onValueChange={setSelectedId}
            className="space-y-3"
          >
            {sortedTransportadoras.map((transportadora) => {
              const isMaisBarato = maisBarato?.cod_transp === transportadora.cod_transp;
              const isMaisRapido = maisRapido?.cod_transp === transportadora.cod_transp && 
                                   transportadora.prazo_entrega === 0;
              const isCorreios = transportadora.nome_transp.toUpperCase().includes("SEDEX") ||
                                 transportadora.nome_transp.toUpperCase().includes("PAC");
              const hasBloqueio = transportadora.bloqueio && transportadora.bloqueio.trim() !== "";
              const isSelected = selectedId === transportadora.cod_transp.toString();

              return (
                <div
                  key={transportadora.cod_transp}
                  className={cn(
                    "relative flex items-start gap-3 p-4 border rounded-lg transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50",
                    hasBloqueio && "opacity-60"
                  )}
                  onClick={() => !hasBloqueio && setSelectedId(transportadora.cod_transp.toString())}
                >
                  <RadioGroupItem
                    value={transportadora.cod_transp.toString()}
                    id={`transp-${transportadora.cod_transp}`}
                    disabled={hasBloqueio}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label
                        htmlFor={`transp-${transportadora.cod_transp}`}
                        className="font-semibold text-base cursor-pointer"
                      >
                        {transportadora.nome_transp}
                      </Label>
                      
                      {isMaisBarato && (
                        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Mais barato
                        </Badge>
                      )}
                      
                      {isMaisRapido && !isMaisBarato && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Mais rápido
                        </Badge>
                      )}
                      
                      {isCorreios && (
                        <Badge variant="outline" className="text-xs">
                          Correios
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-bold text-lg text-foreground">
                        {formatCurrency(transportadora.vl_tot_frete)}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatPrazo(transportadora.prazo_entrega)}
                      </span>
                    </div>

                    {hasBloqueio && (
                      <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Bloqueado: {transportadora.bloqueio}</span>
                      </div>
                    )}

                    {transportadora.vl_tde > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Taxa de entrega especial: {formatCurrency(transportadora.vl_tde)}
                      </div>
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
