import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MetaVendedor, useMetasVendedor } from "@/hooks/useMetasVendedor";
import { AlertCircle, Calendar, TrendingUp, Target, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetaIndividualCardProps {
  meta: MetaVendedor;
}

export default function MetaIndividualCard({ meta }: MetaIndividualCardProps) {
  const { atualizarProgresso } = useMetasVendedor();

  // Calcular percentual de conclusão
  const percentualConclusao = meta.meta_valor > 0 
    ? ((meta.valor_atual || 0) / meta.meta_valor) * 100 
    : 0;

  // Calcular dias restantes
  const hoje = new Date();
  const dataFim = new Date(meta.periodo_fim);
  const diasRestantes = differenceInDays(dataFim, hoje);
  const metaVencida = diasRestantes < 0;
  const metaProximaVencer = diasRestantes >= 0 && diasRestantes <= 7;

  // Determinar cor do status
  const getStatusColor = () => {
    if (meta.status === "concluida") return "default";
    if (meta.status === "cancelada") return "secondary";
    if (metaVencida) return "destructive";
    if (percentualConclusao >= 100) return "default";
    if (percentualConclusao >= 80) return "secondary";
    return "outline";
  };

  // Determinar texto do status
  const getStatusText = () => {
    if (meta.status === "concluida") return "Concluída";
    if (meta.status === "cancelada") return "Cancelada";
    if (metaVencida) return "Vencida";
    if (percentualConclusao >= 100) return "Atingida";
    return "Em andamento";
  };

  return (
    <>
      <Card className={`transition-all hover:shadow-lg ${metaVencida ? "border-destructive" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Target size={16} className="text-primary" />
                Meta de Vendas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(meta.periodo_inicio), "dd MMM", { locale: ptBR })} -{" "}
                {format(new Date(meta.periodo_fim), "dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Valor */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(meta.valor_atual || 0)}
              </span>
            </div>
            <Progress value={Math.min(percentualConclusao, 100)} className="h-2" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                Meta: {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(meta.meta_valor)}
              </span>
              <span className="text-xs font-medium">{percentualConclusao.toFixed(1)}%</span>
            </div>
          </div>

          {/* Alertas */}
          {metaProximaVencer && !metaVencida && (
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg">
              <AlertCircle size={16} />
              <span className="text-xs font-medium">
                {diasRestantes === 0 ? "Vence hoje!" : `${diasRestantes} dias restantes`}
              </span>
            </div>
          )}

          {metaVencida && meta.status === "ativa" && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle size={16} />
              <span className="text-xs font-medium">Meta vencida há {Math.abs(diasRestantes)} dias</span>
            </div>
          )}

          {/* Métricas adicionais */}
          {(meta.meta_unidades || meta.meta_margem || meta.meta_conversao) && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              {meta.meta_unidades && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Unidades</p>
                  <p className="text-sm font-medium">
                    {meta.unidades_atual || 0}/{meta.meta_unidades}
                  </p>
                </div>
              )}
              {meta.meta_margem && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Margem</p>
                  <p className="text-sm font-medium">
                    {((meta.margem_atual || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {meta.meta_conversao && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Conversão</p>
                  <p className="text-sm font-medium">
                    {((meta.conversao_atual || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botão Ver Detalhes */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              // TODO: Implementar modal de detalhes
              console.log("Ver detalhes da meta", meta.id);
            }}
          >
            <Eye size={16} />
            Ver Detalhes
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
