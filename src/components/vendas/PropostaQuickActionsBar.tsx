import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Truck, FileText, Eye, ExternalLink, Loader2 } from "lucide-react";
import { useVendasEntregasCount } from "@/hooks/useVendasEntregas";
import { useVendasNotasFiscaisCount } from "@/hooks/useVendasNotasFiscais";
import { EntregasDialog } from "./EntregasDialog";
import { NotasFiscaisDialog } from "./NotasFiscaisDialog";

interface PropostaQuickActionsBarProps {
  vendaId: string;
  publicUrl?: string | null;
  onPreVisualizacao?: () => void;
}

export function PropostaQuickActionsBar({ 
  vendaId, 
  publicUrl,
  onPreVisualizacao 
}: PropostaQuickActionsBarProps) {
  const [entregasOpen, setEntregasOpen] = useState(false);
  const [notasOpen, setNotasOpen] = useState(false);

  const { data: entregasCount = 0, isLoading: loadingEntregas } = useVendasEntregasCount(vendaId);
  const { data: notasCount = 0, isLoading: loadingNotas } = useVendasNotasFiscaisCount(vendaId);

  const handlePreVisualizacao = () => {
    if (onPreVisualizacao) {
      onPreVisualizacao();
    } else if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center justify-end gap-1 py-2 px-4 bg-muted/30 border-b">
          {/* Entregas */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setEntregasOpen(true)}
              >
                {loadingEntregas ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Entregas</span>
                {entregasCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {entregasCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rastreamento de entregas</TooltipContent>
          </Tooltip>

          {/* Notas Fiscais */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setNotasOpen(true)}
              >
                {loadingNotas ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Notas Fiscais</span>
                {notasCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {notasCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notas fiscais emitidas</TooltipContent>
          </Tooltip>

          {/* Separador */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Pré-Visualização */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handlePreVisualizacao}
                disabled={!publicUrl}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Pré-Visualização</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {publicUrl 
                ? "Visualizar proposta como cliente" 
                : "Gere o link público primeiro"
              }
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Dialogs */}
      <EntregasDialog 
        open={entregasOpen} 
        onOpenChange={setEntregasOpen} 
        vendaId={vendaId} 
      />
      <NotasFiscaisDialog 
        open={notasOpen} 
        onOpenChange={setNotasOpen} 
        vendaId={vendaId} 
      />
    </>
  );
}
