import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Ban,
  Link2Off,
  Clock
} from "lucide-react";

interface PropostaStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}> = {
  enviada: {
    label: "Enviada",
    icon: Send,
    variant: "secondary",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  visualizada: {
    label: "Visualizada",
    icon: Eye,
    variant: "secondary",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  aceita: {
    label: "Aceita",
    icon: CheckCircle2,
    variant: "secondary",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  recusada: {
    label: "Recusada",
    icon: XCircle,
    variant: "secondary",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  ganha: {
    label: "Ganha",
    icon: Trophy,
    variant: "secondary",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  perdida: {
    label: "Perdida",
    icon: Ban,
    variant: "secondary",
    className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
  sem_link: {
    label: "Sem Link",
    icon: Link2Off,
    variant: "outline",
    className: "bg-muted/50 text-muted-foreground",
  },
  expirada: {
    label: "Expirada",
    icon: Clock,
    variant: "outline",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
};

export function PropostaStatusBadge({ status, className }: PropostaStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.sem_link;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className || ""} gap-1 font-normal`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
