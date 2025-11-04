import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface AutoSaveIndicatorProps {
  status: "salvando" | "salvo" | "erro";
  lastSaved?: Date;
}

export const AutoSaveIndicator = ({ status, lastSaved }: AutoSaveIndicatorProps) => {
  if (status === "salvando") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Salvando...</span>
      </div>
    );
  }

  if (status === "erro") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Erro ao salvar</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-success">
      <CheckCircle2 className="h-4 w-4" />
      <span>
        Salvo {lastSaved ? `às ${lastSaved.toLocaleTimeString()}` : ""}
      </span>
    </div>
  );
};
