import { CheckCircle, XCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AcoesMassaBarProps {
  selectedCount: number;
  onAprovar: () => void;
  onRejeitar: () => void;
  onExcluir: () => void;
  onCancelar: () => void;
  isLoading?: boolean;
  showAprovar?: boolean;
}

export function AcoesMassaBar({
  selectedCount,
  onAprovar,
  onRejeitar,
  onExcluir,
  onCancelar,
  isLoading = false,
  showAprovar = true,
}: AcoesMassaBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-lg border-2 border-primary/20">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "item selecionado" : "itens selecionados"}
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          {showAprovar && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAprovar}
              disabled={isLoading}
              className="text-success hover:bg-success/10 hover:text-success"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onRejeitar}
            disabled={isLoading}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onExcluir}
            disabled={isLoading}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>

          <div className="h-6 w-px bg-border" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelar}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}
