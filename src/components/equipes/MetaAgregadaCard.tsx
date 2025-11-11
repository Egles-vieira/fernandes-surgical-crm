import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, TrendingUp, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { useMetasAgregadas } from "@/hooks/useMetasAgregadas";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MetaDetalhesDialog } from "./MetaDetalhesDialog";

interface MetaAgregadaCardProps {
  equipeId: string;
}

export function MetaAgregadaCard({ equipeId }: MetaAgregadaCardProps) {
  const { metasAgregadas, metaManual, divergencia, isLoading } = useMetasAgregadas({ equipeId });
  const [showDetalhes, setShowDetalhes] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} />
            Carregando...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const metaAgregada = metasAgregadas?.[0];

  if (!metaAgregada) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} />
            Meta Agregada
          </CardTitle>
          <CardDescription>
            Nenhuma meta individual de vendedor encontrada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Sem metas de vendedores</AlertTitle>
            <AlertDescription>
              Para ver a meta agregada, primeiro crie metas individuais para os vendedores desta equipe.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} className="text-primary" />
                Meta Agregada da Equipe
              </CardTitle>
              <CardDescription>
                Soma automática das metas de {metaAgregada.total_vendedores} vendedor(es)
              </CardDescription>
            </div>
            <Badge variant={metaAgregada.status_geral === "ativa" ? "default" : "secondary"}>
              {metaAgregada.status_geral}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Valor Total */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <span className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(metaAgregada.total_realizado_valor || 0)}
              </span>
            </div>
            <Progress value={Math.min(metaAgregada.percentual_atingimento, 100)} className="h-3" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Meta: {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(metaAgregada.total_meta_valor)}
              </span>
              <Badge 
                variant={
                  metaAgregada.percentual_atingimento >= 100 
                    ? "default" 
                    : metaAgregada.percentual_atingimento >= 80 
                    ? "secondary" 
                    : "destructive"
                }
              >
                {metaAgregada.percentual_atingimento.toFixed(1)}%
              </Badge>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vendedores</p>
                <p className="text-sm font-medium">{metaAgregada.total_vendedores}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Média/Vendedor</p>
                <p className="text-sm font-medium">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(metaAgregada.total_meta_valor / metaAgregada.total_vendedores)}
                </p>
              </div>
            </div>
          </div>

          {/* Alerta de Divergência */}
          {divergencia && divergencia.tem_divergencia && (
            <Alert 
              variant={divergencia.alerta === "alta" ? "destructive" : "default"}
              className="mt-4"
            >
              <AlertTriangle size={16} />
              <AlertTitle>
                {divergencia.alerta === "alta" ? "Divergência Significativa Detectada" : "Divergência Detectada"}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  A meta manual da equipe difere da soma das metas dos vendedores em{" "}
                  <strong>{Math.abs(divergencia.percentual_divergencia).toFixed(1)}%</strong>
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Meta Manual:</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(divergencia.valor_meta_manual)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Meta Agregada:</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(divergencia.valor_meta_agregada)}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmação de Sincronização */}
          {divergencia && !divergencia.tem_divergencia && (
            <Alert className="mt-4">
              <CheckCircle size={16} />
              <AlertTitle>Metas Sincronizadas</AlertTitle>
              <AlertDescription>
                A meta manual está alinhada com a soma das metas individuais dos vendedores.
              </AlertDescription>
            </Alert>
          )}

          {/* Botão Detalhes */}
          {metaManual && (
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowDetalhes(true)}
            >
              Ver Detalhes da Meta Manual
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      {metaManual && (
        <MetaDetalhesDialog
          meta={metaManual as any}
          open={showDetalhes}
          onOpenChange={setShowDetalhes}
        />
      )}
    </>
  );
}
