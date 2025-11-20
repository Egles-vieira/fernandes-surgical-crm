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
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { usePopularEmbeddings } from "@/hooks/usePopularEmbeddings";

export function PopularEmbeddingsDialog() {
  const [open, setOpen] = useState(false);
  const {
    isProcessing,
    progresso,
    totalProcessado,
    totalTokens,
    tempoTotal,
    iniciarPopulacao,
    cancelar,
  } = usePopularEmbeddings();

  const handleIniciar = () => {
    iniciarPopulacao();
  };

  const handleCancelar = () => {
    cancelar();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Popular Embeddings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Popular Embeddings de Produtos</DialogTitle>
          <DialogDescription>
            Gera embeddings (vetores semânticos) para todos os produtos usando IA.
            O processo será executado em lotes de 50 produtos.
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
                ) : progresso?.concluido ? (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Concluído
                  </Badge>
                ) : (
                  <Badge variant="secondary">Aguardando</Badge>
                )}
              </div>

              {progresso && (
                <>
                  <Progress value={progresso.progresso_percent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progresso.progresso_percent.toFixed(1)}% completo
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Estatísticas */}
          {progresso && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Processados</p>
                  <p className="text-2xl font-bold">{totalProcessado}</p>
                  <p className="text-xs text-muted-foreground">
                    de {progresso.total_produtos} produtos
                  </p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Restantes</p>
                  <p className="text-2xl font-bold">{progresso.restantes}</p>
                  <p className="text-xs text-muted-foreground">produtos pendentes</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tokens Usados</p>
                  <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">tokens OpenAI</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tempo Total</p>
                  <p className="text-2xl font-bold">
                    {(tempoTotal / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-muted-foreground">tempo de processamento</p>
                </div>
              </Card>
            </div>
          )}

          {/* Erros */}
          {progresso?.detalhes_erros && progresso.detalhes_erros.length > 0 && (
            <Card className="p-4 border-destructive">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {progresso.detalhes_erros.length} erros encontrados
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {progresso.detalhes_erros.slice(0, 5).map((erro, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      Produto {erro.produto_id}: {erro.erro}
                    </p>
                  ))}
                  {progresso.detalhes_erros.length > 5 && (
                    <p className="text-muted-foreground italic">
                      ... e mais {progresso.detalhes_erros.length - 5} erros
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Mensagem */}
          {progresso?.mensagem && (
            <p className="text-sm text-muted-foreground text-center">
              {progresso.mensagem}
            </p>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2">
            {isProcessing ? (
              <Button onClick={handleCancelar} variant="destructive">
                Cancelar
              </Button>
            ) : progresso?.concluido ? (
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            ) : (
              <>
                <Button onClick={() => setOpen(false)} variant="outline">
                  Fechar
                </Button>
                <Button onClick={handleIniciar}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Processamento
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
