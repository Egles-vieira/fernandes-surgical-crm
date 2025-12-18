import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface JanelaStatusBadgeProps {
  janelaAberta: boolean;
  tempoRestanteFormatado: string;
  isLoading?: boolean;
  compact?: boolean;
}

export function JanelaStatusBadge({
  janelaAberta,
  tempoRestanteFormatado,
  isLoading = false,
  compact = false,
}: JanelaStatusBadgeProps) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span>Verificando...</span>}
      </Badge>
    );
  }

  if (janelaAberta) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 text-xs border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
                compact && "px-1.5"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              {!compact && (
                <>
                  <Clock className="h-3 w-3" />
                  <span>{tempoRestanteFormatado}</span>
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">
              <strong>Janela de 24h ativa</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Tempo restante: {tempoRestanteFormatado}
            </p>
            <p className="text-xs text-muted-foreground">
              Você pode enviar mensagens normalmente
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs border-destructive/50 bg-destructive/10 text-destructive",
              compact && "px-1.5"
            )}
          >
            <AlertCircle className="h-3 w-3" />
            {!compact && <span>Expirada</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">
            <strong>Janela de 24h expirada</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Use um template aprovado para reabrir a conversa
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
