import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Plus } from "lucide-react";
import { useMetasVendedor } from "@/hooks/useMetasVendedor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovaMetaVendedorDialog } from "./NovaMetaVendedorDialog";
import { useState } from "react";

interface MetasVendedorCardProps {
  vendedorId: string;
  equipeId?: string;
  isLiderOuAdmin?: boolean;
}

export function MetasVendedorCard({ vendedorId, equipeId, isLiderOuAdmin = false }: MetasVendedorCardProps) {
  const { metas, isLoading, criarMeta } = useMetasVendedor(vendedorId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const metasAtivas = metas || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas Individuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas Individuais
          </CardTitle>
          {isLiderOuAdmin && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {metasAtivas.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Nenhuma meta ativa no momento
              </p>
              {isLiderOuAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Meta
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {metasAtivas.map((meta) => {
                const valorAtual = meta.valor_atual || 0;
                const percentual = (valorAtual / meta.meta_valor) * 100;
                const isProximaDoFim =
                  new Date(meta.periodo_fim).getTime() - Date.now() <
                  7 * 24 * 60 * 60 * 1000;

                return (
                  <div key={meta.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">
                          Meta de Vendas
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(meta.periodo_inicio), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}{" "}
                          até{" "}
                          {format(new Date(meta.periodo_fim), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Badge variant={percentual >= 100 ? "default" : percentual >= 70 ? "secondary" : "outline"}>
                        {meta.status || "ativa"}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">
                          {percentual.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.min(percentual, 100)} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          R$ {valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <span>
                          R$ {meta.meta_valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {isProximaDoFim && (
                      <Badge variant="outline" className="text-xs">
                        Encerrando em breve
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NovaMetaVendedorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendedorId={vendedorId}
        equipeId={equipeId}
        onCriar={(meta) => criarMeta.mutate(meta)}
      />
    </>
  );
}
