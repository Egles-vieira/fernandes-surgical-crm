import { useState } from "react";
import { FileText, CheckCircle2, XCircle, Clock, Database, FileJson, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEDILogs } from "@/hooks/useEDILogs";
import { usePlataformasEDI } from "@/hooks/usePlataformasEDI";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoricoImportacoes() {
  const [pagina, setPagina] = useState(0);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [logSelecionado, setLogSelecionado] = useState<any>(null);
  const [plataformaFiltro, setPlataformaFiltro] = useState<string | undefined>();

  const { plataformas } = usePlataformasEDI();
  const limite = 20;
  const offset = pagina * limite;

  const { logs, total, stats, isLoading } = useEDILogs({
    plataforma_id: plataformaFiltro,
    limite,
    offset,
  });

  const totalPaginas = Math.ceil(total / limite);

  const abrirDetalhes = (log: any) => {
    setLogSelecionado(log);
    setDetalhesOpen(true);
  };

  if (isLoading && pagina === 0) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Importações</h1>
          <p className="text-muted-foreground">
            Gestão técnica de importações XML
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Importações</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Todas as importações</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sucessos || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.taxaSucesso.toFixed(1)}% de sucesso
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.erros || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? ((stats.erros / stats.total) * 100).toFixed(1) : 0}% com erro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ultimas24h || 0}</div>
            <p className="text-xs text-muted-foreground">Importações recentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Plataforma:</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={!plataformaFiltro ? "default" : "outline"}
                onClick={() => setPlataformaFiltro(undefined)}
              >
                Todas
              </Button>
              {plataformas?.map(plat => (
                <Button
                  key={plat.id}
                  size="sm"
                  variant={plataformaFiltro === plat.id ? "default" : "outline"}
                  onClick={() => setPlataformaFiltro(plat.id)}
                >
                  {plat.nome}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Importações Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {log.sucesso ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {format(new Date(log.executado_em), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </span>
                      {log.plataformas_edi && (
                        <Badge variant="outline">{log.plataformas_edi.nome}</Badge>
                      )}
                      <Badge variant={log.sucesso ? "default" : "destructive"}>
                        {log.sucesso ? "Sucesso" : "Erro"}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {log.mensagem_retorno || "Importação processada"}
                    </div>

                    {log.tempo_execucao_ms && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Tempo: {(log.tempo_execucao_ms / 1000).toFixed(2)}s
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirDetalhes(log)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma importação encontrada</p>
            </div>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Página {pagina + 1} de {totalPaginas} ({total} registros)
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagina(p => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina === totalPaginas - 1}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {logSelecionado?.sucesso ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Detalhes da Importação
            </DialogTitle>
            <DialogDescription>
              {logSelecionado && format(new Date(logSelecionado.executado_em), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {logSelecionado && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="xml">XML Original</TabsTrigger>
                <TabsTrigger value="payload">Dados Importados</TabsTrigger>
                <TabsTrigger value="erro">Erros</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Plataforma</label>
                    <p className="text-sm text-muted-foreground">
                      {logSelecionado.plataformas_edi?.nome || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm">
                      <Badge variant={logSelecionado.sucesso ? "default" : "destructive"}>
                        {logSelecionado.sucesso ? "Sucesso" : "Erro"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tempo de Execução</label>
                    <p className="text-sm text-muted-foreground">
                      {logSelecionado.tempo_execucao_ms ? 
                        `${(logSelecionado.tempo_execucao_ms / 1000).toFixed(2)}s` : 
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status HTTP</label>
                    <p className="text-sm text-muted-foreground">
                      {logSelecionado.status_http || "N/A"}
                    </p>
                  </div>
                </div>

                {logSelecionado.mensagem_retorno && (
                  <div>
                    <label className="text-sm font-medium">Mensagem</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {logSelecionado.mensagem_retorno}
                    </p>
                  </div>
                )}

                {logSelecionado.parametros && (
                  <div>
                    <label className="text-sm font-medium">Parâmetros</label>
                    <ScrollArea className="h-40 mt-2 rounded-md border p-4">
                      <pre className="text-xs">
                        {JSON.stringify(logSelecionado.parametros, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="xml">
                <ScrollArea className="h-[600px] w-full rounded-md border">
                  <pre className="text-xs whitespace-pre-wrap p-4 font-mono">
                    {logSelecionado.payload_enviado || "XML não disponível"}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="payload">
                <ScrollArea className="h-[600px] w-full rounded-md border">
                  <pre className="text-xs font-mono p-4">
                    {logSelecionado.payload_recebido ? 
                      JSON.stringify(JSON.parse(logSelecionado.payload_recebido), null, 2) :
                      "Dados não disponíveis"}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="erro">
                {logSelecionado.erro ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 p-4 border border-red-200 rounded-lg bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Erro</p>
                        <p className="text-sm text-red-700 mt-1">{logSelecionado.erro}</p>
                      </div>
                    </div>
                    
                    {logSelecionado.stack_trace && (
                      <div>
                        <label className="text-sm font-medium">Stack Trace</label>
                        <ScrollArea className="h-60 mt-2 rounded-md border p-4 bg-muted">
                          <pre className="text-xs font-mono">
                            {logSelecionado.stack_trace}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
                    <p className="text-muted-foreground">Nenhum erro registrado</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
