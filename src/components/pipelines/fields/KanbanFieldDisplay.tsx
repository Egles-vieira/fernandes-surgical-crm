import { PipelineCustomField } from "@/types/pipelines";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseFieldOptions } from "@/hooks/pipelines/usePipelineFields";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanFieldDisplayProps {
  field: PipelineCustomField;
  value: any;
  className?: string;
}

export function KanbanFieldDisplay({
  field,
  value,
  className,
}: KanbanFieldDisplayProps) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const formatValue = (): React.ReactNode => {
    switch (field.tipo_campo) {
      case "moeda":
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(Number(value));

      case "percentual":
        return `${value}%`;

      case "data":
        try {
          const date = typeof value === "string" ? parseISO(value) : value;
          return format(date, "dd/MM/yyyy", { locale: ptBR });
        } catch {
          return value;
        }

      case "datetime":
        try {
          const datetime = typeof value === "string" ? parseISO(value) : value;
          return format(datetime, "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch {
          return value;
        }

      case "boolean":
        return value ? "Sim" : "Não";

      case "select":
        const options = parseFieldOptions(field.opcoes);
        const option = options.find((o) => o.value === value);
        return option?.label || value;

      case "multiselect":
        if (!Array.isArray(value)) return value;
        const selectOptions = parseFieldOptions(field.opcoes);
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v: string) => {
              const opt = selectOptions.find((o) => o.value === v);
              return (
                <Badge key={v} variant="secondary" className="text-xs">
                  {opt?.label || v}
                </Badge>
              );
            })}
          </div>
        );

      case "url":
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
          >
            {value}
          </a>
        );

      case "email":
        return (
          <a href={`mailto:${value}`} className="text-primary hover:underline">
            {value}
          </a>
        );

      case "telefone":
        return (
          <a href={`tel:${value}`} className="text-primary hover:underline">
            {value}
          </a>
        );

      case "numero":
        return new Intl.NumberFormat("pt-BR").format(Number(value));

      default:
        return String(value);
    }
  };

  return (
    <div className={cn("text-xs", className)}>
      <span className="text-muted-foreground">{field.label}: </span>
      <span className="font-medium">{formatValue()}</span>
    </div>
  );
}
