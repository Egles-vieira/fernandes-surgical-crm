import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, XCircle, Clock, Truck, Calculator } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { parseError } from "@/lib/datasul-errors";
import { DatasulErrorDialog } from "@/components/vendas/DatasulErrorDialog";

interface IntegracaoLog {
  id: string;
  venda_id: string;
  numero_venda: string;
  request_payload: any;
  response_payload: any;
  status: string;
  error_message: string | null;
  tempo_resposta_ms: number;
  tempo_preparacao_dados_ms: number | null;
  tempo_api_ms: number | null;
  tempo_tratamento_dados_ms?: number | null;
  created_at: string;
}

interface IntegracaoDatasulLogProps {
  vendaId?: string;
  tipo?: 'pedido' | 'frete' | 'todos';
}

// Helper para formatar JSON de campos TEXT
const formatJsonField = (field: any) => {
  if (!field) return "N/A";
  
  // Se já é um objeto, só formatar
  if (typeof field === "object") {
    return JSON.stringify(field, null, 2);
  }
  
  // Se é string, tentar fazer parse
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Se não conseguir fazer parse, retornar como está
      return field;
    }
  }
  
  return String(field);
};

export function IntegracaoDatasulLog({ vendaId, tipo = 'todos' }: IntegracaoDatasulLogProps) {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorData, setErrorData] = useState<any>(null);
  const [activeLogType, setActiveLogType] = useState<'pedido' | 'frete'>(tipo === 'frete' ? 'frete' : 'pedido');

  // Query para log de pedido
  const { data: logPedido, isLoading: loadingPedido } = useQuery({
    queryKey: ["integracao-datasul-log", vendaId],
    queryFn: async () => {
      let query = supabase
        .from("integracoes_totvs_calcula_pedido")
        .select("*")
        .order("created_at", { ascending: false });

      if (vendaId) {
        query = query.eq("venda_id", vendaId);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: tipo !== 'frete'
  });

  // Query para log de frete
  const { data: logFrete, isLoading: loadingFrete } = useQuery({
    queryKey: ["integracao-frete-log", vendaId],
    queryFn: async () => {
      let query = supabase
        .from("integracoes_totvs_calcula_frete")
        .select("*")
        .order("created_at", { ascending: false });

      if (vendaId) {
        query = query.eq("venda_id", vendaId);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      return data as IntegracaoLog | null;
    },
    enabled: tipo !== 'pedido'
  });

  const loading = tipo === 'frete' ? loadingFrete : tipo === 'pedido' ? loadingPedido : (loadingPedido || loadingFrete);
  const log = activeLogType === 'frete' ? logFrete : logPedido;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Última Integração Datasul</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyLog = logPedido || logFrete;

  if (!hasAnyLog) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Última Integração Datasul</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma integração realizada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Integração Datasul</CardTitle>
          {tipo === 'todos' && (
            <div className="flex gap-1">
              <Button
                variant={activeLogType === 'pedido' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveLogType('pedido')}
                className="gap-1 h-7 text-xs"
                disabled={!logPedido}
              >
                <Calculator className="h-3 w-3" />
                Pedido
              </Button>
              <Button
                variant={activeLogType === 'frete' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveLogType('frete')}
                className="gap-1 h-7 text-xs"
                disabled={!logFrete}
              >
                <Truck className="h-3 w-3" />
                Frete
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {log ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {log.status === "sucesso" ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Sucesso
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Erro
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  {activeLogType === 'frete' ? <Truck className="h-3 w-3" /> : <Calculator className="h-3 w-3" />}
                  {activeLogType === 'frete' ? 'Frete' : 'Pedido'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Número Venda</p>
                <p className="font-medium">{log.numero_venda}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data/Hora</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(log.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">
                  {log.status === "sucesso" ? (
                    <span className="text-green-600">Sucesso</span>
                  ) : (
                    <span className="text-red-600">Erro</span>
                  )}
                </p>
              </div>
            </div>

            {/* Métricas de Tempo */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-3 text-sm font-semibold">Métricas de Tempo</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tempo Total:</span>
                    <span className="font-mono font-semibold">{log.tempo_resposta_ms || 0}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Preparação dos dados:</span>
                    <span className="font-mono">{log.tempo_preparacao_dados_ms || 0}ms</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Retorno API:</span>
                    <span className="font-mono">{log.tempo_api_ms || 0}ms</span>
                  </div>
                  {log.tempo_tratamento_dados_ms !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tratamento dos dados:</span>
                      <span className="font-mono">{log.tempo_tratamento_dados_ms || 0}ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {log.error_message && (
              <div className="mt-3 space-y-2">
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Erro:</p>
                      <p className="mt-1">{log.error_message}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const parsed = parseError({
                      message: log.error_message,
                      details: log.response_payload,
                    });
                    setErrorData(parsed);
                    setShowErrorDialog(true);
                  }}
                  className="w-full gap-2"
                >
                  Entender Este Erro
                </Button>
              </div>
            )}

            <Tabs defaultValue="request" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="request">Requisição</TabsTrigger>
                <TabsTrigger value="response">Resposta</TabsTrigger>
              </TabsList>
              <TabsContent value="request">
                <ScrollArea className="h-[300px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
                    {formatJsonField(log.request_payload)}
                  </pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="response">
                <ScrollArea className="h-[300px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
                    {formatJsonField(log.response_payload)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum log de {activeLogType === 'frete' ? 'frete' : 'pedido'} encontrado
          </p>
        )}
      </CardContent>
      
      <DatasulErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        error={errorData}
      />
    </Card>
  );
}
