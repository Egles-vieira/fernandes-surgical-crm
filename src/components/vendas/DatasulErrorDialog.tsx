import { AlertCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ParsedError,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/datasul-errors";

interface DatasulErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: ParsedError | null;
  onViewLog?: () => void;
}

export function DatasulErrorDialog({
  open,
  onOpenChange,
  error,
  onViewLog,
}: DatasulErrorDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const categoryLabel = getCategoryLabel(error.categoria);
  const categoryColor = getCategoryColor(error.categoria);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl bg-white dark:bg-white border-primary/20">
        <AlertDialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-xl text-foreground">
                  {error.titulo}
                </AlertDialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {categoryLabel}
                  </Badge>
                  {error.codigoErro && (
                    <Badge variant="outline" className="bg-muted/50 border-muted-foreground/20">
                      Código: {error.codigoErro}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Mensagem Principal */}
            <AlertDialogDescription className="text-base leading-relaxed text-foreground">
              {error.mensagem}
            </AlertDialogDescription>

            <Separator />

            {/* Sugestões de Solução */}
            {error.sugestoes && error.sugestoes.length > 0 && (
              <div className="space-y-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
                <h4 className="text-sm font-semibold text-foreground">
                  Como resolver:
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {error.sugestoes.map((sugestao, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 pt-0.5">{sugestao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detalhes Técnicos (Expansível) */}
            {error.detalhes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full justify-between hover:bg-primary/5"
                  >
                    <span className="text-sm font-medium">
                      Detalhes Técnicos
                    </span>
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {showDetails && (
                    <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                      <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words font-mono">
                        {typeof error.detalhes === 'string'
                          ? error.detalhes
                          : JSON.stringify(error.detalhes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="flex-row gap-2 sm:justify-between">
          {onViewLog && (
            <Button
              variant="outline"
              onClick={() => {
                onViewLog();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Ver Log Completo
            </Button>
          )}
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
