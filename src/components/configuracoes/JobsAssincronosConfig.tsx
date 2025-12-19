import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Info,
  AlertTriangle,
  Zap
} from "lucide-react";
import { useJobsRecalculo, useJobsRecalculoStats } from "@/hooks/useJobsRecalculo";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function JobsAssincronosConfig() {
  const { data: jobs, isLoading, refetch } = useJobsRecalculo();
  const { data: stats } = useJobsRecalculoStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case "processing":
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processando</Badge>;
      case "completed":
        return <Badge variant="outline" className="gap-1 text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3" />Concluído</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Jobs Assíncronos
            </CardTitle>
            <CardDescription>
              Fila de processamento assíncrono para operações pesadas
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                <div className="text-xs text-muted-foreground">Processando</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">Concluídos</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </Card>
            </div>
          )}

          {/* Job Type Info */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium">Recálculo de Valor de Oportunidade</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Descrição:</strong> Recálculo automático do valor total da oportunidade baseado na soma dos itens. Dispara quando itens são atualizados via batch update.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Regra:</strong> Soma (quantidade × preço_unitario - valor_desconto) de todos os itens da oportunidade e atualiza o campo valor na tabela oportunidades.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Processamento:</strong> A cada 5 segundos via Edge Function + pg_cron
                </p>
              </div>
            </div>
          </Card>

          {/* Jobs Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Oportunidade ID</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Processado</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum job na fila
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {job.oportunidade_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{job.tentativas}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(job.criado_em)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(job.processado_em)}
                      </TableCell>
                      <TableCell>
                        {job.erro ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{job.erro}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
