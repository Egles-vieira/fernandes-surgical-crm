import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EtapaPipeline =
  | "prospeccao"
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "fechamento"
  | "ganho"
  | "perdido";

interface FunnelStagesBarProps {
  etapaAtual?: EtapaPipeline;
  onAvancarEtapa?: () => void;
}

const etapas = [
  { id: "prospeccao", label: "Prospecção" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechamento", label: "Fechamento" },
] as const;

export function FunnelStagesBar({ etapaAtual = "proposta", onAvancarEtapa }: FunnelStagesBarProps) {
  // Verifica se a venda foi ganha ou perdida
  const isGanho = etapaAtual === "ganho";
  const isPerdido = etapaAtual === "perdido";
  const isFinalizada = isGanho || isPerdido;

  // Encontra o índice da etapa atual
  const etapaAtualIndex = etapas.findIndex(e => e.id === etapaAtual);

  return (
    <div className="sticky top-[60px] z-20 bg-background border-b shadow-sm px-8 py-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Etapas em formato chevron */}
        <div className="flex items-center -space-x-3">
          {etapas.map((etapa, index) => {
            const isAtual = etapa.id === etapaAtual;
            const isConcluida = index < etapaAtualIndex || isFinalizada;
            const isProxima = index === etapaAtualIndex + 1;

            return (
              <div
                key={etapa.id}
                className={cn(
                  "relative flex items-center justify-center h-12 px-8 pl-10 transition-all",
                  "clip-path-chevron",
                  // Cores baseadas no estado
                  isConcluida && "bg-success/90 text-success-foreground",
                  isAtual && !isFinalizada && "bg-primary text-primary-foreground shadow-lg z-10 scale-105",
                  isProxima && "bg-primary/80 text-primary-foreground",
                  !isConcluida && !isAtual && !isProxima && "bg-muted text-muted-foreground",
                  // Primeiro item tem padding diferente
                  index === 0 && "pl-6 rounded-l-md"
                )}
                style={{
                  clipPath: index === 0 
                    ? "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)"
                    : "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)"
                }}
              >
                <div className="flex items-center gap-2 relative z-10">
                  {isConcluida && (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  )}
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {etapa.label}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Status final (Ganho/Perdido) - apenas se finalizado */}
          {isFinalizada && (
            <div
              className={cn(
                "relative flex items-center justify-center h-12 px-8 pl-10 rounded-r-md transition-all",
                isGanho && "bg-success text-success-foreground",
                isPerdido && "bg-destructive text-destructive-foreground"
              )}
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 16px 50%)"
              }}
            >
              <div className="flex items-center gap-2 relative z-10">
                {isGanho ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span className="text-lg">✕</span>
                )}
                <span className="text-sm font-semibold">
                  {isGanho ? "Ganho" : "Perdido"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botão de ação */}
        {!isFinalizada && onAvancarEtapa && etapaAtualIndex < etapas.length - 1 && (
          <Button 
            onClick={onAvancarEtapa}
            className="ml-6 gap-2 shrink-0"
          >
            Avançar Etapa
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
