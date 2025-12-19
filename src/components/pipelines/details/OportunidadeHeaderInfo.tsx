import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, User, Calendar, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Oportunidade } from "@/types/pipelines";

interface OportunidadeHeaderInfoProps {
  oportunidade: Oportunidade;
}

export function OportunidadeHeaderInfo({ oportunidade }: OportunidadeHeaderInfoProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; className?: string }> = {
    aberto: { label: "Aberto", variant: "default" },
    ganho: { label: "Ganho", variant: "default", className: "bg-green-500" },
    perdido: { label: "Perdido", variant: "destructive" },
    suspenso: { label: "Suspenso", variant: "secondary" },
  };

  const status = oportunidade.status || "aberto";
  const statusInfo = statusConfig[status];

  return (
    <div className="space-y-4">
      {/* Valor em destaque */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">Valor da Oportunidade</div>
        <div className="text-3xl font-bold text-primary">
          {formatCurrency(oportunidade.valor)}
        </div>
        {oportunidade.valor_ponderado && oportunidade.valor_ponderado !== oportunidade.valor && (
          <div className="text-sm text-muted-foreground mt-1">
            Valor ponderado: {formatCurrency(oportunidade.valor_ponderado)}
          </div>
        )}
      </div>

      {/* Probabilidade */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Probabilidade
          </span>
          <span className="font-medium">{oportunidade.probabilidade ?? 0}%</span>
        </div>
        <Progress value={oportunidade.probabilidade ?? 0} className="h-2" />
      </div>

      {/* Status e Estágio */}
      <div className="flex items-center gap-2">
        <Badge variant={statusInfo.variant} className={statusInfo.className}>
          {statusInfo.label}
        </Badge>
        {oportunidade.estagio && (
          <Badge 
            variant="outline" 
            style={{ borderColor: oportunidade.estagio.cor || undefined }}
          >
            {oportunidade.estagio.nome_estagio}
          </Badge>
        )}
      </div>

      {/* Grid de informações */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        {/* Data de fechamento */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Fechamento previsto
          </div>
          <div className="text-sm font-medium">
            {formatDate(oportunidade.data_fechamento_prevista)}
          </div>
        </div>

        {/* Dias no estágio */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Dias no estágio
          </div>
          <div className="text-sm font-medium">
            {oportunidade.dias_no_estagio ?? 0} dias
          </div>
        </div>

        {/* Conta */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Conta
          </div>
          <div className="text-sm font-medium truncate">
            {oportunidade.conta?.nome_conta || "—"}
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            Contato
          </div>
          <div className="text-sm font-medium truncate">
            {oportunidade.contato 
              ? `${oportunidade.contato.primeiro_nome} ${oportunidade.contato.sobrenome}`
              : "—"}
          </div>
        </div>
      </div>

      {/* Observações */}
      {oportunidade.observacoes && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-1">Observações</div>
          <p className="text-sm whitespace-pre-wrap">{oportunidade.observacoes}</p>
        </div>
      )}
    </div>
  );
}
