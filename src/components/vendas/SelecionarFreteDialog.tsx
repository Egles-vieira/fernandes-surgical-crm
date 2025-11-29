import { useState, useMemo, useEffect } from "react";
import { Truck, Clock, Loader2, ArrowUpDown, Search, X, ChevronLeft, ChevronRight, Trophy, Zap, DollarSign } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TransportadoraOption {
  cod_transp: number;
  nome_transp: string;
  cnpj_transp: string;
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

const ITEMS_PER_PAGE = 10;

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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  // Reset estado quando modal abre/fecha
  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [open]);

  // Identificar mais barato e mais rápido (excluindo prazo 0)
  const { maisBarato, maisRapidoComPrazo, melhorOpcao, sortedTransportadoras } = useMemo(() => {
    if (transportadoras.length === 0) {
      return { maisBarato: null, maisRapidoComPrazo: null, melhorOpcao: null, sortedTransportadoras: [] };
    }

    // Mais barato (menor vl_tot_frete)
    const maisBarato = transportadoras.reduce((min, t) =>
      t.vl_tot_frete < min.vl_tot_frete ? t : min
    );

    // Mais rápido excluindo prazo 0
    const transportadorasComPrazo = transportadoras.filter(t => t.prazo_entrega > 0);
    const maisRapidoComPrazo = transportadorasComPrazo.length > 0
      ? transportadorasComPrazo.reduce((min, t) =>
          t.prazo_entrega < min.prazo_entrega ? t : min
        )
      : null;

    // Melhor opção: menor preço E menor prazo (excluindo 0)
    const melhorOpcao = maisRapidoComPrazo && maisBarato.cod_transp === maisRapidoComPrazo.cod_transp
      ? maisBarato
      : null;

    const sorted = [...transportadoras].sort((a, b) => {
      if (sortBy === "preco") {
        return a.vl_tot_frete - b.vl_tot_frete;
      }
      return a.prazo_entrega - b.prazo_entrega;
    });

    return { maisBarato, maisRapidoComPrazo, melhorOpcao, sortedTransportadoras: sorted };
  }, [transportadoras, sortBy]);

  // Filtrar transportadoras
  const filteredTransportadoras = useMemo(() => {
    if (!searchTerm.trim()) return sortedTransportadoras;

    const term = searchTerm.toLowerCase().trim();
    return sortedTransportadoras.filter(t =>
      t.cod_transp.toString().includes(term) ||
      t.nome_transp.toLowerCase().includes(term) ||
      (t.cnpj_transp && t.cnpj_transp.includes(term)) ||
      (t.bloqueio && t.bloqueio.toLowerCase().includes(term))
    );
  }, [sortedTransportadoras, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredTransportadoras.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransportadoras = filteredTransportadoras.slice(startIndex, endIndex);

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

  const getBadgeForTransportadora = (transportadora: TransportadoraOption) => {
    const isMelhorOpcao = melhorOpcao?.cod_transp === transportadora.cod_transp && transportadora.prazo_entrega > 0;
    const isMaisBarato = maisBarato?.cod_transp === transportadora.cod_transp && !isMelhorOpcao;
    const isMaisRapido = maisRapidoComPrazo?.cod_transp === transportadora.cod_transp && !isMelhorOpcao && transportadora.prazo_entrega > 0;

    if (isMelhorOpcao) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs">
          <Trophy className="h-3 w-3" />
          Melhor opção
        </Badge>
      );
    }
    if (isMaisBarato) {
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs">
          <DollarSign className="h-3 w-3" />
          Menor preço
        </Badge>
      );
    }
    if (isMaisRapido) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1 text-xs">
          <Zap className="h-3 w-3" />
          Mais rápido
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[950px] max-h-[90vh] bg-white border-0 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Truck className="h-5 w-5 text-primary" />
            Selecionar Transportadora
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Encontramos {transportadoras.length} opção(ões) de frete para esta entrega.
            {filteredTransportadoras.length !== transportadoras.length && (
              <span className="ml-1 text-primary font-medium">
                ({filteredTransportadoras.length} filtrada(s))
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Filtros e ordenação */}
        <div className="flex items-center gap-4 py-3 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar por código, nome ou bloqueio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 bg-gray-50 border-gray-200 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Ordenar: <span className="font-semibold text-gray-700">{sortBy === "preco" ? "Preço" : "Prazo"}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={toggleSort} className="gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[380px] rounded-lg border border-gray-200 bg-gray-50/50">
          <RadioGroup
            value={selectedId || ""}
            onValueChange={setSelectedId}
            className="space-y-0"
          >
            {/* Header */}
            <div className="grid grid-cols-[70px_1fr_130px_100px_110px_90px_140px] gap-3 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-100/80 sticky top-0 z-10">
              <span>Código</span>
              <span>Transportadora</span>
              <span>CNPJ</span>
              <span className="text-center">Prazo</span>
              <span className="text-right">Valor Frete</span>
              <span className="text-right">Valor TDE</span>
              <span>Status</span>
            </div>

            {paginatedTransportadoras.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <div className="text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma transportadora encontrada</p>
                  <p className="text-sm text-gray-400">Tente ajustar sua pesquisa</p>
                </div>
              </div>
            ) : (
              paginatedTransportadoras.map((transportadora) => {
                const isMelhorOpcao = melhorOpcao?.cod_transp === transportadora.cod_transp && transportadora.prazo_entrega > 0;
                const isMaisBarato = maisBarato?.cod_transp === transportadora.cod_transp && !isMelhorOpcao;
                const hasBloqueio = transportadora.bloqueio && transportadora.bloqueio.trim() !== "";
                const isSelected = selectedId === transportadora.cod_transp.toString();

                return (
                  <div
                    key={transportadora.cod_transp}
                    className={cn(
                      "grid grid-cols-[70px_1fr_130px_100px_110px_90px_140px] gap-3 items-center px-4 py-3.5 transition-all cursor-pointer border-b border-gray-100 bg-white",
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
                      className="font-medium text-sm cursor-pointer text-gray-800 truncate"
                    >
                      {transportadora.nome_transp}
                    </Label>

                    {/* CNPJ */}
                    <span className="text-xs text-gray-500 font-mono">
                      {transportadora.cnpj_transp || "-"}
                    </span>

                    {/* Prazo */}
                    <div className="text-center text-sm text-gray-500">
                      {formatPrazo(transportadora.prazo_entrega)}
                    </div>

                    {/* Valor Frete */}
                    <div className="text-right">
                      <span className={cn(
                        "font-bold text-sm",
                        (isMaisBarato || isMelhorOpcao) ? "text-emerald-600" : "text-gray-900"
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

                    {/* Status / Bloqueio / Badge */}
                    <div className="text-sm">
                      {hasBloqueio ? (
                        <Badge variant="destructive" className="text-xs">
                          {transportadora.bloqueio}
                        </Badge>
                      ) : (
                        getBadgeForTransportadora(transportadora)
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </RadioGroup>
        </ScrollArea>

        {/* Paginação */}
        {filteredTransportadoras.length > 0 && (
          <div className="flex items-center justify-between py-3 px-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
            <span className="text-sm text-gray-500">
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredTransportadoras.length)} de {filteredTransportadoras.length} transportadoras
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1 h-8"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-600">
                Página {currentPage} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="gap-1 h-8"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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
