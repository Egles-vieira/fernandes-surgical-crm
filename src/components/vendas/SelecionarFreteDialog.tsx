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
  if (dias === 0) return "Sem prazo";
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] bg-white border-0 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Truck className="h-5 w-5 text-primary" />
            Selecionar Transportadora
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Encontramos {transportadoras.length} opção(ões) de frete para esta entrega.
            Selecione a transportadora desejada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-3 px-1">
          <span className="text-sm text-gray-500">
            Ordenar por: <span className="font-semibold text-gray-700">{sortBy === "preco" ? "Preço" : "Prazo"}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={toggleSort} className="gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowUpDown className="h-4 w-4" />
            Alternar
          </Button>
        </div>

        <ScrollArea className="max-h-[400px] rounded-lg border border-gray-200 bg-gray-50/50">
          <RadioGroup
            value={selectedId || ""}
            onValueChange={setSelectedId}
            className="space-y-0"
          >
            {/* Header */}
            <div className="grid grid-cols-[70px_1fr_100px_110px_90px_100px_1fr] gap-3 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-100/80">
              <span>Código</span>
              <span>Transportadora</span>
              <span className="text-center">Prazo</span>
              <span className="text-right">Valor Frete</span>
              <span className="text-right">Valor TDE</span>
              <span className="text-center">Status</span>
              <span>Bloqueio</span>
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
                    "grid grid-cols-[70px_1fr_100px_110px_90px_100px_1fr] gap-3 items-center px-4 py-3.5 transition-all cursor-pointer border-b border-gray-100 bg-white",
                    isSelected
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : "hover:bg-gray-50",
                    hasBloqueio && "cursor-not-allowed bg-red-50/50"
                  )}
                  onClick={() => !hasBloqueio && setSelectedId(transportadora.cod_transp.toString())}
                >
                  {/* Código */}
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value={transportadora.cod_transp.toString()}
                      id={`transp-${transportadora.cod_transp}`}
                      disabled={hasBloqueio}
                      className="border-gray-300 text-primary"
                    />
                    <span className="text-xs text-gray-500 font-mono">
                      {transportadora.cod_transp}
                    </span>
                  </div>

                  {/* Transportadora */}
                  <Label
                    htmlFor={`transp-${transportadora.cod_transp}`}
                    className="font-medium text-sm cursor-pointer text-gray-800"
                  >
                    {index + 1}º {transportadora.nome_transp}
                  </Label>

                  {/* Prazo */}
                  <div className="text-center text-sm text-gray-500">
                    {formatPrazo(transportadora.prazo_entrega)}
                  </div>

                  {/* Valor Frete */}
                  <div className="text-right">
                    <span className={cn(
                      "font-bold text-sm",
                      isMaisBarato ? "text-emerald-600" : "text-gray-900"
                    )}>
                      {formatCurrency(transportadora.vl_tot_frete)}
                    </span>
                  </div>

                  {/* Valor TDE */}
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(transportadora.vl_tde)}
                    </span>
                  </div>

                  {/* Status/Badges */}
                  <div className="flex justify-center">
                    {isMaisBarato && !hasBloqueio && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium">
                        Menor
                      </Badge>
                    )}
                    {isMaisRapido && !isMaisBarato && !hasBloqueio && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs font-medium">
                        Rápido
                      </Badge>
                    )}
                    {hasBloqueio && (
                      <Badge variant="destructive" className="text-xs">
                        Bloqueado
                      </Badge>
                    )}
                  </div>

                  {/* Bloqueio */}
                  <div className="text-sm">
                    {hasBloqueio ? (
                      <span className="text-red-600 font-medium">
                        {transportadora.bloqueio}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTransportadora || isConfirming}
            className="min-w-[160px] bg-primary hover:bg-primary/90"
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
