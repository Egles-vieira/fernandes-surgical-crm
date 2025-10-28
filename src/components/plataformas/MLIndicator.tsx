import { Brain, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MLIndicatorProps {
  ajusteML?: number;
  totalFeedbacks?: number;
  taxaSucesso?: number;
  compact?: boolean;
}

export function MLIndicator({ ajusteML = 0, totalFeedbacks = 0, taxaSucesso, compact = false }: MLIndicatorProps) {
  if (totalFeedbacks === 0 && ajusteML === 0) return null;

  const temAjuste = ajusteML !== 0;
  const ajustePositivo = ajusteML > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={temAjuste ? (ajustePositivo ? "default" : "secondary") : "outline"} 
            className={`gap-1 cursor-help ${compact ? 'text-xs' : ''}`}
          >
            <Brain className="h-3 w-3" />
            {compact ? (
              <>ML{temAjuste && (ajustePositivo ? ' +' : ' ')}{temAjuste && ajusteML.toFixed(0)}</>
            ) : (
              <>
                ML Ativo
                {temAjuste && (
                  <>
                    {ajustePositivo ? (
                      <TrendingUp className="h-3 w-3 ml-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 ml-1" />
                    )}
                    <span className="font-semibold">
                      {ajustePositivo ? '+' : ''}{ajusteML.toFixed(0)}
                    </span>
                  </>
                )}
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Brain className="h-4 w-4" />
              Machine Learning Ativo
            </div>
            
            {temAjuste && (
              <div className="text-sm">
                <p>
                  {ajustePositivo ? (
                    <span className="text-green-600">
                      ✓ Score aumentado em {ajusteML.toFixed(0)} pontos
                    </span>
                  ) : (
                    <span className="text-red-600">
                      ✗ Score reduzido em {Math.abs(ajusteML).toFixed(0)} pontos
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-1">
                  Baseado em {totalFeedbacks} feedback{totalFeedbacks !== 1 ? 's' : ''} anterior{totalFeedbacks !== 1 ? 'es' : ''}
                  {taxaSucesso !== undefined && ` (${taxaSucesso.toFixed(0)}% de sucesso)`}
                </p>
              </div>
            )}

            {!temAjuste && totalFeedbacks > 0 && (
              <p className="text-sm text-muted-foreground">
                Este produto já recebeu {totalFeedbacks} feedback{totalFeedbacks !== 1 ? 's' : ''}, 
                mas ainda não tem ajustes aplicados.
              </p>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              A IA aprende com suas escolhas e ajusta automaticamente 
              as sugestões futuras para produtos similares.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
