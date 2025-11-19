import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface IntegracaoLog {
  id: string;
  venda_id: string;
  numero_venda: string;
  request_payload: any;
  response_payload: any;
  status: string;
  error_message: string | null;
  tempo_resposta_ms: number;
  created_at: string;
}

interface IntegracaoDatasulLogProps {
  vendaId?: string;
}

export function IntegracaoDatasulLog({ vendaId }: IntegracaoDatasulLogProps) {
  const { data: log, isLoading: loading } = useQuery({
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
  });

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

  if (!log) {
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
          <CardTitle className="text-sm">Última Integração Datasul</CardTitle>
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Número Venda</p>
            <p className="font-medium">{log.numero_venda}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tempo Resposta</p>
            <p className="font-medium">{log.tempo_resposta_ms}ms</p>
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
        </div>

        {log.error_message && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">Erro:</p>
            <p className="text-sm text-destructive/90">{log.error_message}</p>
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
                {JSON.stringify(log.request_payload, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="response">
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <pre className="p-4 text-xs">
                {JSON.stringify(log.response_payload, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
