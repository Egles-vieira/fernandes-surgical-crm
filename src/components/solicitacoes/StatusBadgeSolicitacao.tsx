import { Badge } from "@/components/ui/badge";

interface StatusBadgeSolicitacaoProps {
  status: "rascunho" | "em_analise" | "aprovado" | "rejeitado";
}

export const StatusBadgeSolicitacao = ({ status }: StatusBadgeSolicitacaoProps) => {
  const statusConfig = {
    rascunho: { label: "Rascunho", variant: "secondary" as const },
    em_analise: { label: "Em Análise", variant: "default" as const },
    aprovado: { label: "Aprovado", variant: "default" as const },
    rejeitado: { label: "Rejeitado", variant: "destructive" as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={
      status === "aprovado" ? "bg-success text-success-foreground" :
      status === "em_analise" ? "bg-warning text-warning-foreground" : ""
    }>
      {config.label}
    </Badge>
  );
};
