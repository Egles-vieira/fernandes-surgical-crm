import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
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
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Trophy className="h-4 w-4 text-amber-600" />;
    return <span className="text-muted-foreground">{index + 1}º</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard de Vendedores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Atingimento</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendedores.map((vendedor, index) => (
              <TableRow
                key={vendedor.vendedor_id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  index < 3 && "font-medium"
                )}
                onClick={() => onSelectVendedor?.(vendedor)}
              >
                <TableCell className="flex items-center justify-center">
                  {getRankBadge(index)}
                </TableCell>
                <TableCell className="font-medium">{vendedor.nome_vendedor}</TableCell>
                <TableCell>
                  <Badge variant="outline">{vendedor.equipe_nome || "Sem equipe"}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(vendedor.meta_valor)}</TableCell>
                <TableCell className="text-right">{formatCurrency(vendedor.realizado_valor)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {vendedor.percentual_atingimento >= 100 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : vendedor.percentual_atingimento >= 80 ? (
                      <TrendingUp className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={cn(
                        "font-medium",
                        vendedor.percentual_atingimento >= 100 && "text-green-600",
                        vendedor.percentual_atingimento >= 80 &&
                          vendedor.percentual_atingimento < 100 &&
                          "text-yellow-600",
                        vendedor.percentual_atingimento < 80 && "text-red-600"
                      )}
                    >
                      {formatPercent(vendedor.percentual_atingimento)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{vendedor.total_vendas}</TableCell>
                <TableCell className="text-right">{formatPercent(vendedor.margem_media)}</TableCell>
                <TableCell className="text-right">{formatPercent(vendedor.taxa_conversao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
