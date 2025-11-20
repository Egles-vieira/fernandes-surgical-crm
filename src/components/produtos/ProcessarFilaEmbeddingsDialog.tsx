import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Zap, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useProcessarFilaEmbeddings } from "@/hooks/useProcessarFilaEmbeddings";

export function ProcessarFilaEmbeddingsDialog() {
  const [open, setOpen] = useState(false);
  const {
    isProcessing,
    resultado,
    totalProcessado,
    totalFalhas,
    iniciarProcessamento,
    cancelar,
  } = useProcessarFilaEmbeddings();

  const handleIniciar = () => {
    iniciarProcessamento();
  };

  const handleCancelar = () => {
    cancelar();
    setOpen(false);
  };

  const progressPercent = resultado?.total_completados && resultado?.pendentes_restantes !== undefined
    ? ((resultado.total_completados / (resultado.total_completados + resultado.pendentes_restantes)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="h-4 w-4 mr-2" />
          Processar Fila
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Processar Fila de Embeddings</DialogTitle>
          <DialogDescription>
            Processa a fila de produtos aguardando geração de embeddings.
            Sistema automático com retry e controle de falhas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Geral */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {isProcessing ? (
                  <Badge variant="default" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processando
                  </Badge>
                ) : resultado?.fila_vazia ? (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Fila Vazia
                  </Badge>
                ) : resultado ? (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pausado
                  </Badge>
                ) : (
                  <Badge variant="secondary">Aguardando</Badge>
                )}
              </div>

              {resultado && (
                <>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progressPercent.toFixed(1)}% completo
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Estatísticas */}
          {resultado && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Processados</p>
                  <p className="text-2xl font-bold text-green-600">{totalProcessado}</p>
                  <p className="text-xs text-muted-foreground">com sucesso</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {resultado.pendentes_restantes}
                  </p>
                  <p className="text-xs text-muted-foreground">na fila</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Falhas</p>
                  <p className="text-2xl font-bold text-red-600">{totalFalhas}</p>
                  <p className="text-xs text-muted-foreground">com erro</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Completos</p>
                  <p className="text-2xl font-bold">{resultado.total_completados}</p>
                  <p className="text-xs text-muted-foreground">embeddings gerados</p>
                </div>
              </Card>
            </div>
          )}

          {/* Detalhes de Falhas */}
          {resultado?.detalhes && resultado.detalhes.filter(d => d.status === "falha").length > 0 && (
            <Card className="p-4 border-destructive">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {resultado.detalhes.filter(d => d.status === "falha").length} erros no último lote
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {resultado.detalhes
                    .filter(d => d.status === "falha")
                    .slice(0, 5)
                    .map((detalhe, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Produto {detalhe.produto_id.substring(0, 8)}: {detalhe.erro}
                      </p>
                    ))}
                  {resultado.detalhes.filter(d => d.status === "falha").length > 5 && (
                    <p className="text-muted-foreground italic">
                      ... e mais {resultado.detalhes.filter(d => d.status === "falha").length - 5} erros
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Mensagem */}
          {resultado?.mensagem && (
            <p className="text-sm text-muted-foreground text-center">
              {resultado.mensagem}
            </p>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2">
            {isProcessing ? (
              <Button onClick={handleCancelar} variant="destructive">
                Cancelar
              </Button>
            ) : resultado?.fila_vazia ? (
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            ) : (
              <>
                <Button onClick={() => setOpen(false)} variant="outline">
                  Fechar
                </Button>
                <Button onClick={handleIniciar}>
                  <Zap className="h-4 w-4 mr-2" />
                  {resultado ? "Continuar Processamento" : "Iniciar Processamento"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
