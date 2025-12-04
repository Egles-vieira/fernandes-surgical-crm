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
      variant: "default" as const,
      className: "bg-success text-success-foreground",
      icon: CheckCircle
    },
    vencendo: {
      label: "Vencendo",
      variant: "default" as const,
      className: "bg-warning text-warning-foreground",
      icon: AlertTriangle
    },
    vencido: {
      label: "Vencido",
      variant: "destructive" as const,
      className: "",
      icon: XCircle
    },
    sem_validade: {
      label: "Sem Validade",
      variant: "secondary" as const,
      className: "",
      icon: Clock
    }
  };

  const cfg = config[status as keyof typeof config] || config.sem_validade;
  const Icon = cfg.icon;

  return (
    <Badge variant={cfg.variant} className={cn(cfg.className, className)}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}
