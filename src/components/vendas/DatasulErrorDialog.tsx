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
  getCategoryIcon,
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

  // Debug logs
  console.log("🟢 DatasulErrorDialog renderizado:", { open, hasError: !!error });

  if (!error) {
    console.log("🟡 Modal não tem erro para exibir");
    return null;
  }

  const categoryIcon = getCategoryIcon(error.categoria);
  const categoryLabel = getCategoryLabel(error.categoria);
  const categoryColor = getCategoryColor(error.categoria);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl flex items-center gap-2">
                <span>{categoryIcon}</span>
                <span>{error.titulo}</span>
              </AlertDialogTitle>
              <div className="mt-2">
                <Badge variant="outline" className={categoryColor}>
                  {categoryLabel}
                  {error.codigoErro && ` • Código: ${error.codigoErro}`}
                </Badge>
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Mensagem Principal */}
            <AlertDialogDescription className="text-base leading-relaxed">
              {error.mensagem}
            </AlertDialogDescription>

            <Separator />

            {/* Sugestões de Solução */}
            {error.sugestoes && error.sugestoes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  Sugestões de Solução:
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {error.sugestoes.map((sugestao, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{sugestao}</span>
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
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span>📋</span>
                      Detalhes Técnicos
                    </span>
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {showDetails && (
                    <div className="rounded-lg bg-muted p-4">
                      <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
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

        <AlertDialogFooter className="flex gap-2">
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
            Fechar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
