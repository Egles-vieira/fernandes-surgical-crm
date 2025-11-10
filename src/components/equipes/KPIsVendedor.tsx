import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceVendedor } from "@/hooks/usePerformanceVendedores";
import { DollarSign, ShoppingCart, Percent, TrendingUp, Target, Award } from "lucide-react";
import { KPICard } from "./KPICard";
import { Badge } from "@/components/ui/badge";

interface KPIsVendedorProps {
  vendedor: PerformanceVendedor;
}

export function KPIsVendedor({ vendedor }: KPIsVendedorProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{vendedor.nome_vendedor}</CardTitle>
            <Badge variant="outline">{vendedor.equipe_nome || "Sem equipe"}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Meta do Período"
          value={formatCurrency(vendedor.meta_valor)}
          icon={Target}
        />
        <KPICard
          title="Realizado"
          value={formatCurrency(vendedor.realizado_valor)}
          subtitle={`${formatPercent(vendedor.percentual_atingimento)} da meta`}
          icon={DollarSign}
          trend={
            vendedor.percentual_atingimento >= 100
              ? "up"
              : vendedor.percentual_atingimento >= 80
              ? "neutral"
              : "down"
          }
        />
        <KPICard
          title="Atingimento"
          value={formatPercent(vendedor.percentual_atingimento)}
          icon={Award}
          trend={
            vendedor.percentual_atingimento >= 100
              ? "up"
              : vendedor.percentual_atingimento >= 80
              ? "neutral"
              : "down"
          }
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(vendedor.ticket_medio)}
          icon={ShoppingCart}
        />
        <KPICard
          title="Taxa de Conversão"
          value={formatPercent(vendedor.taxa_conversao)}
          subtitle={`${vendedor.vendas_ganhas} vendas ganhas`}
          icon={TrendingUp}
          trend={vendedor.taxa_conversao >= 50 ? "up" : vendedor.taxa_conversao >= 30 ? "neutral" : "down"}
        />
        <KPICard
          title="Margem Média"
          value={formatPercent(vendedor.margem_media)}
          icon={Percent}
          trend={vendedor.margem_media >= 20 ? "up" : vendedor.margem_media >= 10 ? "neutral" : "down"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estatísticas Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total de Vendas</p>
              <p className="text-2xl font-bold">{vendedor.total_vendas}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Valor Total Vendido</p>
              <p className="text-2xl font-bold">{formatCurrency(vendedor.valor_vendido)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Vendas Ganhas</p>
              <p className="text-2xl font-bold text-green-600">{vendedor.vendas_ganhas}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Vendas Perdidas</p>
              <p className="text-2xl font-bold text-red-600">{vendedor.vendas_perdidas}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Probabilidade Média</p>
              <p className="text-2xl font-bold">{formatPercent(vendedor.probabilidade_media)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
