import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CotacaoActionBarProps {
  status: string;
  numeroCotacao: string;
  onResponder?: () => void;
  onCancelar?: () => void;
  onConfirmar?: () => void;
}

export function CotacaoActionBar({
  status,
  numeroCotacao,
  onResponder,
  onCancelar,
  onConfirmar,
}: CotacaoActionBarProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "nova":
        return { label: "Nova", variant: "secondary" as const };
      case "em_analise":
        return { label: "Em Análise", variant: "default" as const };
      case "respondida":
        return { label: "Respondida", variant: "default" as const };
      case "confirmada":
        return { label: "Confirmada", variant: "default" as const };
      case "perdida":
        return { label: "Perdida", variant: "destructive" as const };
      case "cancelada":
        return { label: "Cancelada", variant: "outline" as const };
      default:
        return { label: status, variant: "outline" as const };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">
            Cotação {numeroCotacao}
          </h1>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {status === "nova" && onResponder && (
            <Button onClick={onResponder}>
              Iniciar Análise
            </Button>
          )}
          
          {status === "em_analise" && (
            <>
              {onCancelar && (
                <Button variant="outline" onClick={onCancelar}>
                  Cancelar
                </Button>
              )}
              {onResponder && (
                <Button onClick={onResponder}>
                  Responder Cotação
                </Button>
              )}
            </>
          )}
          
          {status === "respondida" && onConfirmar && (
            <Button onClick={onConfirmar}>
              Confirmar Pedido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
