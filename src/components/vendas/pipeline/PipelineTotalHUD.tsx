import { TrendingUp } from "lucide-react";

interface PipelineTotalHUDProps {
  valorTotal: number;
}

export function PipelineTotalHUD({ valorTotal }: PipelineTotalHUDProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pipeline Total
          </span>
        </div>
        <span className="text-2xl font-bold text-foreground">
          {formatCurrency(valorTotal)}
        </span>
      </div>
    </div>
  );
}
