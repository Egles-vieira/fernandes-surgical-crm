import { FileText, X, CheckCircle, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CotacaoActionBarProps {
  status: "nova" | "em_analise" | "respondida" | "confirmada" | "perdida" | "cancelada";
  onResponder: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
  onEnviar: () => void;
  onResetarAnalise?: () => void;
  analiseIATravada?: boolean;
}

export function CotacaoActionBar({
  status,
  onResponder,
  onCancelar,
  onConfirmar,
  onEnviar,
  onResetarAnalise,
  analiseIATravada = false,
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
          {analiseIATravada && onResetarAnalise && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetarAnalise}
              className="gap-2 border-warning text-warning hover:bg-warning/10"
            >
              <RotateCcw size={16} />
              Resetar Análise
            </Button>
          )}
          
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
  );
}
