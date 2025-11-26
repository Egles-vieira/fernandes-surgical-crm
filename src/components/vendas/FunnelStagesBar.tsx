import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const etapas = [
  { id: "prospeccao", label: "Prospecção" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechamento", label: "Fechamento" },
] as const;

export function FunnelStagesBar({ etapaAtual = "proposta" }: FunnelStagesBarProps) {
  // Verifica se a venda foi ganha ou perdida
  const isGanho = etapaAtual === "ganho";
  const isPerdido = etapaAtual === "perdido";
  const isFinalizada = isGanho || isPerdido;

  // Encontra o índice da etapa atual
  const etapaAtualIndex = etapas.findIndex(e => e.id === etapaAtual);

  return (
    <div className="sticky top-[60px] z-20 bg-background border-b shadow-sm px-8 py-4">
      <div className="flex items-center justify-center gap-2">
        {etapas.map((etapa, index) => {
          const isAtual = etapa.id === etapaAtual;
          const isConcluida = index < etapaAtualIndex || isFinalizada;
          const isProxima = index === etapaAtualIndex + 1;

          return (
            <div key={etapa.id} className="flex items-center">
              {/* Etapa */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isConcluida && "bg-success border-success text-success-foreground",
                    isAtual && !isFinalizada && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg",
                    !isConcluida && !isAtual && "bg-muted border-border text-muted-foreground",
                    isProxima && "border-primary/50"
                  )}
                >
                  {isConcluida ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium whitespace-nowrap transition-all",
                    isAtual && "text-primary font-semibold",
                    isConcluida && "text-success",
                    !isConcluida && !isAtual && "text-muted-foreground"
                  )}
                >
                  {etapa.label}
                </span>
              </div>

              {/* Conector */}
              {index < etapas.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-0.5 mx-2 mb-6 transition-all",
                    isConcluida ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}

        {/* Status final (Ganho/Perdido) */}
        {isFinalizada && (
          <>
            <div className="w-16 h-0.5 mx-2 mb-6 bg-border" />
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 scale-110 shadow-lg",
                  isGanho && "bg-success border-success text-success-foreground",
                  isPerdido && "bg-destructive border-destructive text-destructive-foreground"
                )}
              >
                {isGanho ? <Check className="h-5 w-5" /> : "✕"}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-semibold whitespace-nowrap",
                  isGanho && "text-success",
                  isPerdido && "text-destructive"
                )}
              >
                {isGanho ? "Ganho" : "Perdido"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
