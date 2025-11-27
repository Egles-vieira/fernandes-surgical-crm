import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Award } from "lucide-react";
import { PerformanceVendedor } from "@/hooks/usePerformanceVendedores";
import { cn } from "@/lib/utils";

interface LeaderboardVendedoresProps {
  vendedores: PerformanceVendedor[];
  onSelectVendedor?: (vendedor: PerformanceVendedor) => void;
}

export function LeaderboardVendedores({ vendedores, onSelectVendedor }: LeaderboardVendedoresProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30">
          <Crown className="h-4 w-4 text-white" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 shadow-md">
          <Medal className="h-4 w-4 text-white" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 shadow-md">
          <Award className="h-4 w-4 text-white" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
        <span className="text-sm font-semibold text-muted-foreground">{index + 1}º</span>
      </div>
    );
  };

  const getRowStyle = (index: number) => {
    if (index === 0) return "bg-yellow-500/5 hover:bg-yellow-500/10 border-l-4 border-l-yellow-500";
    if (index === 1) return "bg-slate-500/5 hover:bg-slate-500/10 border-l-4 border-l-slate-400";
    if (index === 2) return "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-600";
    return "hover:bg-muted/50 border-l-4 border-l-transparent";
  };

  const getAtingimentoColor = (value: number) => {
    if (value >= 100) return "bg-emerald-500";
    if (value >= 80) return "bg-yellow-500";
    if (value >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-card to-card/95">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-lg font-bold">Ranking de Vendedores</span>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              Performance do período atual
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-16 text-center font-semibold">Rank</TableHead>
                <TableHead className="font-semibold">Vendedor</TableHead>
                <TableHead className="font-semibold">Equipe</TableHead>
                <TableHead className="text-right font-semibold">Meta</TableHead>
                <TableHead className="text-right font-semibold">Realizado</TableHead>
                <TableHead className="text-center font-semibold w-40">Atingimento</TableHead>
                <TableHead className="text-right font-semibold">Vendas</TableHead>
                <TableHead className="text-right font-semibold">Margem</TableHead>
                <TableHead className="text-right font-semibold">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((vendedor, index) => (
                <TableRow
                  key={vendedor.vendedor_id}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    getRowStyle(index),
                    index < 3 && "font-medium"
                  )}
                  onClick={() => onSelectVendedor?.(vendedor)}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center justify-center">
                      {getRankBadge(index)}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {vendedor.nome_vendedor?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <span className="font-medium truncate max-w-[150px]">
                        {vendedor.nome_vendedor}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge 
                      variant="outline" 
                      className="bg-background/50 border-border/50 font-normal"
                    >
                      {vendedor.equipe_nome || "Sem equipe"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 tabular-nums text-muted-foreground">
                    {formatCurrency(vendedor.meta_valor)}
                  </TableCell>
                  <TableCell className="text-right py-3 tabular-nums font-semibold">
                    {formatCurrency(vendedor.realizado_valor)}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", getAtingimentoColor(vendedor.percentual_atingimento))}
                            style={{ width: `${Math.min(vendedor.percentual_atingimento, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 min-w-[60px] justify-end">
                          {vendedor.percentual_atingimento >= 100 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          ) : vendedor.percentual_atingimento >= 80 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              vendedor.percentual_atingimento >= 100 && "text-emerald-600",
                              vendedor.percentual_atingimento >= 80 &&
                                vendedor.percentual_atingimento < 100 &&
                                "text-yellow-600",
                              vendedor.percentual_atingimento < 80 && "text-red-500"
                            )}
                          >
                            {formatPercent(vendedor.percentual_atingimento)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3 tabular-nums">
                    <Badge variant="secondary" className="font-semibold">
                      {vendedor.total_vendas}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 tabular-nums text-muted-foreground">
                    {formatPercent(vendedor.margem_media)}
                  </TableCell>
                  <TableCell className="text-right py-3 tabular-nums text-muted-foreground">
                    {formatPercent(vendedor.taxa_conversao)}
                  </TableCell>
                </TableRow>
              ))}
              {vendedores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Nenhum vendedor encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
