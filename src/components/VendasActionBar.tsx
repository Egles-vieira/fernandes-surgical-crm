import { Calculator, X, ShieldCheck, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VendasActionBarProps {
  status: "rascunho" | "aprovada" | "cancelada";
  onCalcular: () => void;
  onCancelar: () => void;
  onDiretoria: () => void;
  onEfetivar: () => void;
  onSalvar?: () => void;
  isSaving?: boolean;
  editandoVendaId?: string | null;
}

export function VendasActionBar({
  status,
  onCalcular,
  onCancelar,
  onDiretoria,
  onEfetivar,
  onSalvar,
  isSaving = false,
  editandoVendaId = null,
}: VendasActionBarProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "rascunho":
        return {
          label: "Rascunho",
          className: "bg-secondary/10 text-secondary border-secondary/20",
        };
      case "aprovada":
        return {
          label: "Aprovada",
          className: "bg-success/10 text-success border-success/20",
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
            Status da Proposta:
          </span>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCalcular}
            className="gap-2"
          >
            <Calculator size={16} />
            Calcular
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelar}
            className="gap-2"
          >
            <X size={16} />
            Cancelar
          </Button>
          
          {onSalvar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSalvar}
              disabled={isSaving}
              className="gap-2"
            >
              <Save size={16} />
              {editandoVendaId ? "Atualizar Venda" : "Salvar Venda"}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDiretoria}
            className="gap-2"
          >
            <ShieldCheck size={16} />
            Diretoria
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={onEfetivar}
            className="gap-2"
          >
            <CheckCircle size={16} />
            Efetivar
          </Button>
        </div>
      </div>
    </div>
  );
}
