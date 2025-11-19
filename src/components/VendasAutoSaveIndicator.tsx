import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendasAutoSaveIndicatorProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  className?: string;
}

export function VendasAutoSaveIndicator({ hasUnsavedChanges, isSaving, className }: VendasAutoSaveIndicatorProps) {
  if (!hasUnsavedChanges && !isSaving) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Salvando...</span>
        </>
      ) : hasUnsavedChanges ? (
        <>
          <Save className="h-4 w-4 text-warning" />
          <span className="text-warning">Alterações não salvas</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-success">Salvo</span>
        </>
      )}
    </div>
  );
}
