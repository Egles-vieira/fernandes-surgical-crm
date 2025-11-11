import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trophy, TrendingUp, TrendingDown, Target, Award, AlertCircle, Lightbulb } from "lucide-react";
import { PerformanceVendedor } from "@/hooks/usePerformanceVendedores";

interface ComparativoMetasEquipeProps {
  vendedores: PerformanceVendedor[];
  equipeNome?: string;
}

export function ComparativoMetasEquipe({ vendedores, equipeNome }: ComparativoMetasEquipeProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Ordenar vendedores por percentual de atingimento
  const vendedoresOrdenados = [...vendedores].sort(
    (a, b) => b.percentual_atingimento - a.percentual_atingimento
  );

  // Calcular estatísticas da equipe
  const mediaAtingimento = vendedores.reduce((acc, v) => acc + v.percentual_atingimento, 0) / vendedores.length;
  const melhorPerformance = vendedoresOrdenados[0];
  const piorPerformance = vendedoresOrdenados[vendedoresOrdenados.length - 1];
  const totalMetaEquipe = vendedores.reduce((acc, v) => acc + v.meta_valor, 0);
  const totalRealizadoEquipe = vendedores.reduce((acc, v) => acc + v.realizado_valor, 0);
  const gapTotalEquipe = totalMetaEquipe - totalRealizadoEquipe;

  // Identificar melhores práticas (vendedores acima da média)
  const vendedoresAcimaDaMedia = vendedores.filter(v => v.percentual_atingimento > mediaAtingimento);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getRankIcon = (position: number) => {
    if (position < 3) {
      return <Trophy className={`h-5 w-5 ${getRankColor(position)}`} />;
    }
    return <Target className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Visão Geral da Equipe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visão Geral {equipeNome && `- ${equipeNome}`}</CardTitle>
              <CardDescription>Performance consolidada da equipe</CardDescription>
            </div>
            <Award className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Meta Total</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMetaEquipe)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Realizado Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalRealizadoEquipe)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Gap Total</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-destructive">{formatCurrency(gapTotalEquipe)}</p>
                {gapTotalEquipe > 0 && <TrendingDown className="h-5 w-5 text-destructive" />}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Atingimento Médio</p>
              <p className="text-2xl font-bold">{formatPercent(mediaAtingimento)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Progresso Consolidado</p>
            <Progress value={(totalRealizadoEquipe / totalMetaEquipe) * 100} className="h-3" />
            <p className="text-xs text-muted-foreground text-right">
              {formatPercent((totalRealizadoEquipe / totalMetaEquipe) * 100)} da meta da equipe
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ranking de Vendedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking de Performance
          </CardTitle>
          <CardDescription>Vendedores ordenados por atingimento de meta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendedoresOrdenados.map((vendedor, index) => {
              const gap = vendedor.meta_valor - vendedor.realizado_valor;
              const isAcimaDaMedia = vendedor.percentual_atingimento > mediaAtingimento;

              return (
                <div key={vendedor.vendedor_id} className="space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Posição e Avatar */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(vendedor.nome_vendedor)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{vendedor.nome_vendedor}</p>
                        <p className="text-xs text-muted-foreground">#{index + 1} no ranking</p>
                      </div>
                    </div>

                    {/* Badges de Destaque */}
                    <div className="flex gap-2">
                      {index === 0 && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          🏆 Líder
                        </Badge>
                      )}
                      {isAcimaDaMedia && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Acima da Média
                        </Badge>
                      )}
                      {vendedor.percentual_atingimento >= 100 && (
                        <Badge variant="default" className="bg-green-600">
                          ✓ Meta Atingida
                        </Badge>
                      )}
                      {vendedor.percentual_atingimento < 50 && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Atenção
                        </Badge>
                      )}
                    </div>

                    {/* Métricas */}
                    <div className="flex gap-6 ml-auto">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Meta</p>
                        <p className="font-semibold">{formatCurrency(vendedor.meta_valor)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Realizado</p>
                        <p className="font-semibold text-primary">{formatCurrency(vendedor.realizado_valor)}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-muted-foreground">Gap</p>
                        <p className={`font-semibold ${gap > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(Math.abs(gap))}
                        </p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-xs text-muted-foreground">Atingimento</p>
                        <p className={`text-lg font-bold ${
                          vendedor.percentual_atingimento >= 100 
                            ? 'text-green-600' 
                            : vendedor.percentual_atingimento >= 80 
                            ? 'text-yellow-600' 
                            : 'text-destructive'
                        }`}>
                          {formatPercent(vendedor.percentual_atingimento)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="ml-14 space-y-1">
                    <Progress 
                      value={Math.min(vendedor.percentual_atingimento, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span className="font-medium">Meta: 100%</span>
                      <span>{formatPercent(vendedor.percentual_atingimento)}</span>
                    </div>
                  </div>

                  {index < vendedoresOrdenados.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Maiores Gaps
            </CardTitle>
            <CardDescription>Vendedores com maior distância da meta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendedoresOrdenados
                .filter(v => v.percentual_atingimento < 100)
                .slice(0, 5)
                .map((vendedor) => {
                  const gap = vendedor.meta_valor - vendedor.realizado_valor;
                  const percentualGap = ((gap / vendedor.meta_valor) * 100);

                  return (
                    <div key={vendedor.vendedor_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                              {getInitials(vendedor.nome_vendedor)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{vendedor.nome_vendedor}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">{formatCurrency(gap)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPercent(percentualGap)} da meta
                          </p>
                        </div>
                      </div>
                      <Progress value={100 - percentualGap} className="h-1.5 bg-destructive/20" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Melhores Práticas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Melhores Práticas
            </CardTitle>
            <CardDescription>Vendedores com performance acima da média</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendedoresAcimaDaMedia.length > 0 ? (
                <>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Destaques da Equipe
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vendedoresAcimaDaMedia.length} vendedor(es) estão performando acima da média de{" "}
                      <span className="font-semibold">{formatPercent(mediaAtingimento)}</span>
                    </p>
                  </div>

                  {vendedoresAcimaDaMedia.map((vendedor) => (
                    <div key={vendedor.vendedor_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-green-500/10 text-green-700 text-xs">
                              {getInitials(vendedor.nome_vendedor)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{vendedor.nome_vendedor}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPercent(vendedor.percentual_atingimento)} de atingimento
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                            +{formatPercent(vendedor.percentual_atingimento - mediaAtingimento)} vs média
                          </Badge>
                          {vendedor.taxa_conversao > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Conv: {formatPercent(vendedor.taxa_conversao)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Insights:</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {melhorPerformance.taxa_conversao > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            <strong>{melhorPerformance.nome_vendedor}</strong> tem taxa de conversão de{" "}
                            {formatPercent(melhorPerformance.taxa_conversao)}
                          </span>
                        </li>
                      )}
                      {melhorPerformance.ticket_medio > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Ticket médio mais alto: {formatCurrency(melhorPerformance.ticket_medio)}
                          </span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>
                          Considere sessões de mentoria entre top performers e equipe
                        </span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum vendedor acima da média identificado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
