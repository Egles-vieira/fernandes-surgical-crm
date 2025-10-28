import { Badge } from "@/components/ui/badge";
import { Brain, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MLStatusBadgeProps {
  erroML?: string;
  circuitBreakerAberto?: boolean;
}

export function MLStatusBadge({ erroML, circuitBreakerAberto }: MLStatusBadgeProps) {
  if (!erroML && !circuitBreakerAberto) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-3 w-3" />
            ML Degradado
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-yellow-600">
              <Brain className="h-4 w-4" />
              Machine Learning em Modo Degradado
            </div>
            
            {circuitBreakerAberto && (
              <p className="text-sm">
                🔴 Circuit breaker ativado - DeepSeek temporariamente desabilitado após múltiplas falhas.
              </p>
            )}

            {erroML && (
              <p className="text-sm">
                ⚠️ {erroML}
              </p>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              A análise está funcionando apenas com busca por tokens e similaridade. 
              A análise semântica será restaurada automaticamente.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
