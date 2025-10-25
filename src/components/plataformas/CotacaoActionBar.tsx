import { FileText, X, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CotacaoActionBarProps {
  status: "nova" | "em_analise" | "respondida" | "confirmada" | "perdida" | "cancelada";
  onResponder: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
  onEnviar: () => void;
}

export function CotacaoActionBar({
  status,
  onResponder,
  onCancelar,
  onConfirmar,
  onEnviar,
}: CotacaoActionBarProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "nova":
        return {
          label: "Nova",
          className: "bg-secondary/10 text-secondary border-secondary/20",
        };
      case "em_analise":
        return {
          label: "Em Análise",
          className: "bg-primary/10 text-primary border-primary/20",
        };
      case "respondida":
        return {
          label: "Respondida",
          className: "bg-success/10 text-success border-success/20",
        };
      case "confirmada":
        return {
          label: "Confirmada",
          className: "bg-success/10 text-success border-success/20",
        };
      case "perdida":
        return {
          label: "Perdida",
          className: "bg-muted/10 text-muted-foreground border-muted/20",
        };
      case "cancelada":
        return {
          label: "Cancelada",
          className: "bg-destructive/10 text-destructive border-destructive/20",
        };
      default:
        return {
          label: status,
          className: "bg-muted",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed top-16 left-0 right-0 z-30 bg-card border-b shadow-sm px-8 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Status da Cotação:
          </span>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {status === "em_analise" && (
            <Button
              variant="default"
              size="sm"
              onClick={onResponder}
              className="gap-2"
            >
              <FileText size={16} />
              Responder
            </Button>
          )}
          
          {status === "respondida" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEnviar}
                className="gap-2"
              >
                <Send size={16} />
                Enviar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirmar}
                className="gap-2"
              >
                <CheckCircle size={16} />
                Confirmar
              </Button>
            </>
          )}
          
          {(status === "nova" || status === "em_analise" || status === "respondida") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelar}
              className="gap-2"
            >
              <X size={16} />
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
