import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusAnaliseIABadgeProps {
  statusAnalise: 'pendente' | 'em_analise' | 'concluida' | 'erro' | 'cancelada' | null;
  progresso?: number;
  itensAnalisados?: number;
  totalItens?: number;
  tempoEstimado?: number; // segundos
  className?: string;
}

export function StatusAnaliseIABadge({
  statusAnalise,
  progresso = 0,
  itensAnalisados = 0,
  totalItens = 0,
  tempoEstimado,
  className,
}: StatusAnaliseIABadgeProps) {
  
  // Pendente (aguardando análise)
  if (!statusAnalise || statusAnalise === 'pendente') {
    return (
      <Badge variant="secondary" className={cn("gap-1.5", className)}>
        <Clock className="h-3 w-3" />
        Aguardando análise
      </Badge>
    );
  }

  // Em análise (com animação e progresso)
  if (statusAnalise === 'em_analise') {
    const progressoPercent = totalItens > 0 
      ? Math.round((itensAnalisados / totalItens) * 100)
      : progresso;
    
    const tempoRestante = tempoEstimado 
      ? tempoEstimado > 60 
        ? `~${Math.ceil(tempoEstimado / 60)}min`
        : `~${tempoEstimado}s`
      : '';

    return (
      <Badge 
        variant="default" 
        className={cn(
          "gap-1.5 animate-pulse bg-primary/90 hover:bg-primary/80",
          className
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="font-medium">
          Analisando... {progressoPercent}%
        </span>
        {totalItens > 0 && (
          <span className="text-xs opacity-90">
            ({itensAnalisados}/{totalItens} itens)
          </span>
        )}
        {tempoRestante && (
          <span className="text-xs opacity-75">{tempoRestante}</span>
        )}
      </Badge>
    );
  }

  // Concluída (sucesso)
  if (statusAnalise === 'concluida') {
    return (
      <Badge 
        variant="default" 
        className={cn(
          "gap-1.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
          className
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        Análise completa
        {totalItens > 0 && (
          <span className="text-xs opacity-90">
            - {itensAnalisados}/{totalItens} itens
          </span>
        )}
      </Badge>
    );
  }

  // Erro
  if (statusAnalise === 'erro') {
    return (
      <Badge 
        variant="destructive" 
        className={cn("gap-1.5", className)}
      >
        <XCircle className="h-3 w-3" />
        Erro na análise
      </Badge>
    );
  }

  // Cancelada
  if (statusAnalise === 'cancelada') {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1.5", className)}
      >
        <XCircle className="h-3 w-3" />
        Cancelada
      </Badge>
    );
  }

  return null;
}
