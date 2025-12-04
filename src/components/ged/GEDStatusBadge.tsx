import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface GEDStatusBadgeProps {
  status: string;
  className?: string;
}

export function GEDStatusBadge({ status, className }: GEDStatusBadgeProps) {
  const config = {
    valido: {
      label: "Válido",
      className: "bg-success/10 text-success border-success/20",
      icon: CheckCircle
    },
    vencendo: {
      label: "Vencendo",
      className: "bg-warning/10 text-warning border-warning/20",
      icon: AlertTriangle
    },
    vencido: {
      label: "Vencido",
      className: "bg-destructive/10 text-destructive border-destructive/20",
      icon: XCircle
    },
    sem_validade: {
      label: "Sem Validade",
      className: "bg-muted text-muted-foreground",
      icon: Clock
    }
  };

  const cfg = config[status as keyof typeof config] || config.sem_validade;
  const Icon = cfg.icon;

  return (
    <Badge variant="outline" className={cn(cfg.className, className)}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}