import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, HelpCircle } from "lucide-react";
import { Decisao } from "@/types/cnpja";

interface DecisaoCardProps {
  titulo: string;
  decisao: Decisao;
  icone?: React.ReactNode;
}

export function DecisaoCard({ titulo, decisao, icone }: DecisaoCardProps) {
  const Icon = decisao.decisao ? Check : X;
  const badgeClass = decisao.decisao 
    ? "bg-success/10 text-success border-success/20" 
    : "";
  const textoBadge = decisao.decisao ? "SIM" : "NÃO";

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: decisao.decisao 
        ? 'hsl(var(--success))' 
        : 'hsl(var(--muted-foreground))',
    }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Conteúdo */}
          <div className="flex-1 space-y-2">
            {/* Título e Badge */}
            <div className="flex items-center gap-2">
              {icone && <div className="text-muted-foreground">{icone}</div>}
              <h4 className="font-semibold">{titulo}</h4>
              <Badge variant={decisao.decisao ? "default" : "secondary"} className={`ml-auto ${badgeClass}`}>
                {textoBadge}
              </Badge>
            </div>

            {/* Motivo */}
            <p className="text-sm text-muted-foreground">
              {decisao.motivo}
            </p>

            {/* Custo (se houver) */}
            {decisao.custoCreditos !== undefined && decisao.custoCreditos > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Custo:</span>
                <span className="font-medium">{decisao.custoCreditos}₪</span>
              </div>
            )}

            {/* Tipo de consulta (se houver) */}
            {decisao.tipoConsulta && (
              <div className="flex items-center gap-1 text-xs">
                <Badge variant="outline" className="text-xs">
                  {decisao.tipoConsulta === 'sintegra' ? 'Sintegra' : 'CCC'}
                </Badge>
                {decisao.custoCreditos === 0 && (
                  <span className="text-muted-foreground">(gratuito)</span>
                )}
              </div>
            )}
          </div>

          {/* Ícone de status */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              decisao.decisao
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
