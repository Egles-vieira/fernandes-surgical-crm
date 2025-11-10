import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MetaComProgresso } from "@/hooks/useMetasEquipe";
import { useMetasEquipe } from "@/hooks/useMetasEquipe";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MetaDetalhesSheetProps {
  meta: MetaComProgresso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetaDetalhesSheet({ meta, open, onOpenChange }: MetaDetalhesSheetProps) {
  const { useProgressoMeta, useAlertasMeta, marcarAlertaLido } = useMetasEquipe();
  const { data: progresso = [] } = useProgressoMeta(meta?.id);
  const { data: alertas = [] } = useAlertasMeta(meta?.id);

  if (!meta) return null;

  const formatValor = (valor: number) => {
    if (meta.unidade_medida === 'R$') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor);
    }
    return `${valor.toFixed(2)} ${meta.unidade_medida || ''}`;
  };

  const getAlertaSeveridadeColor = (severidade: string) => {
    switch (severidade) {
      case 'critico':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'aviso':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'info':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getOrigemIcon = (origem: string) => {
    switch (origem) {
      case 'venda':
        return '💰';
      case 'ticket':
        return '🎫';
      case 'manual':
        return '✏️';
      case 'ajuste':
        return '⚙️';
      default:
        return '📊';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span className="break-words">{meta.nome}</span>
            <Badge variant={meta.meta_atingida ? 'default' : 'secondary'} className="capitalize">
              {meta.status}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="visao-geral" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="progresso">
              Progresso ({progresso.length})
            </TabsTrigger>
            <TabsTrigger value="alertas">
              Alertas ({alertas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações da Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {meta.descricao && (
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Descrição</p>
                    <p className="text-sm text-muted-foreground">{meta.descricao}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Tipo de Meta</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {meta.tipo_meta.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Métrica</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {meta.metrica.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 text-foreground">Progresso Atual</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{formatValor(meta.valor_atual)}</span>
                      <span className="text-muted-foreground">
                        {meta.percentual_conclusao.toFixed(1)}%
                      </span>
                      <span className="text-foreground">{formatValor(meta.valor_objetivo)}</span>
                    </div>
                    <Progress value={Math.min(meta.percentual_conclusao, 100)} className="h-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Período Início</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meta.periodo_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Período Fim</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meta.periodo_fim), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Dias Restantes</p>
                    <p className="text-sm text-muted-foreground">
                      {meta.dias_restantes > 0 
                        ? `${Math.ceil(meta.dias_restantes)} dias`
                        : 'Vencido'
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Prioridade</p>
                    <Badge variant="outline" className="capitalize">{meta.prioridade}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1 text-foreground">Situação</p>
                    <Badge variant="outline" className="capitalize">{meta.situacao_prazo.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progresso" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {progresso.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum progresso registrado ainda
                  </p>
                ) : (
                  progresso.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getOrigemIcon(p.origem)}</span>
                            <div>
                              <p className="font-medium capitalize text-foreground">{p.origem}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(p.registrado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <Badge variant={p.diferenca > 0 ? "default" : "secondary"}>
                            {p.diferenca > 0 ? '+' : ''}{formatValor(p.diferenca)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Anterior</p>
                            <p className="font-medium text-foreground">{formatValor(p.valor_anterior)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Novo</p>
                            <p className="font-medium text-foreground">{formatValor(p.valor_novo)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conclusão</p>
                            <p className="font-medium text-foreground">{p.percentual_conclusao.toFixed(1)}%</p>
                          </div>
                        </div>

                        {p.observacao && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {p.observacao}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {alertas.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum alerta ativo</p>
                  </div>
                ) : (
                  alertas.map((alerta) => (
                    <Card key={alerta.id} className={cn("border-2", getAlertaSeveridadeColor(alerta.severidade))}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {alerta.severidade === 'critico' && <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                              {alerta.severidade === 'aviso' && <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />}
                              {alerta.severidade === 'info' && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                              <Badge className={getAlertaSeveridadeColor(alerta.severidade)}>
                                {alerta.tipo_alerta.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2 text-foreground break-words">{alerta.mensagem}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(alerta.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => marcarAlertaLido.mutate(alerta.id)}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
