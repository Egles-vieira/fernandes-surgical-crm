import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Phone, Clock, User, AlertTriangle, ChevronDown, Copy, Download } from "lucide-react";
import { formatDuracao, formatTimestamp, getEventIcon, getStatusColor, getStatusLabel } from "@/lib/ura-utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface LogDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string | null;
  logSimulado?: any;
}

interface EventoTimeline {
  timestamp: string;
  tipo: string;
  descricao: string;
  dados_adicionais?: any;
}

export function LogDetalhesDialog({ open, onOpenChange, logId, logSimulado }: LogDetalhesDialogProps) {
  const { toast } = useToast();
  const [metadataOpen, setMetadataOpen] = useState(false);

  const { data: logFromDB, isLoading } = useQuery({
    queryKey: ["ura-log-detalhes", logId],
    queryFn: async () => {
      if (!logId || logId.startsWith('simulacao-')) return null;
      
      const { data, error } = await supabase
        .from("ura_logs")
        .select("*, uras(nome)")
        .eq("id", logId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!logId && !logId.startsWith('simulacao-') && open,
  });

  // Usar log simulado se fornecido, senão usar do banco
  const log = logSimulado || logFromDB;

  const handleCopyMetadata = () => {
    if (log?.metadata) {
      navigator.clipboard.writeText(JSON.stringify(log.metadata, null, 2));
      toast({
        title: "Copiado!",
        description: "Metadata copiado para a área de transferência",
      });
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Chamada</span>
            {log?.chamada_id && (
              <Badge variant="outline" className="font-mono text-xs">
                ID: {log.chamada_id.substring(0, 8)}...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-8rem)]">
          <div className="space-y-6 pr-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : log ? (
              <>
                {/* Informações Principais */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Número Origem</p>
                        <p className="font-medium">{log.numero_origem || "Não informado"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duração Total</p>
                        <p className="font-medium">{formatDuracao(log.duracao_total)}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(log.status_final)}>
                        {getStatusLabel(log.status_final)}
                      </Badge>
                    </div>
                    {log.transferido_para && (
                      <div>
                        <p className="text-xs text-muted-foreground">Transferido para</p>
                        <p className="font-medium">{log.transferido_para}</p>
                      </div>
                    )}
                  </div>

                  {log.tentativas_invalidas > 0 && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">
                        {log.tentativas_invalidas} tentativa(s) inválida(s)
                      </span>
                    </div>
                  )}

                  {log.metadata && typeof log.metadata === 'object' && 'agente_atendente' in log.metadata && log.metadata.agente_atendente && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Atendido por</p>
                        <p className="font-medium">
                          {(log.metadata.agente_atendente as any).nome}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold mb-4">Timeline da Chamada</h3>
                  <div className="space-y-4">
                    {log.metadata && typeof log.metadata === 'object' && 'eventos' in log.metadata && Array.isArray(log.metadata.eventos) ? (
                      (log.metadata.eventos as unknown as EventoTimeline[]).map((evento: EventoTimeline, index: number) => (
                        <TimelineItem
                          key={index}
                          evento={evento}
                          referenciaInicio={log.criado_em}
                          isLast={index === (log.metadata as any).eventos.length - 1}
                        />
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <p>Nenhum evento registrado na timeline</p>
                        <p className="text-sm mt-2">
                          A chamada foi registrada mas não há detalhes de eventos disponíveis
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Técnica */}
                <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Informações Técnicas</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          metadataOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="rounded-lg border bg-muted/30 p-4 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleCopyMetadata}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <pre className="text-xs overflow-auto max-h-64">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Gravação */}
                {log.gravacao_url && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Gravação da Chamada
                    </h3>
                    <div className="space-y-3">
                      <audio controls className="w-full">
                        <source src={log.gravacao_url} type="audio/mpeg" />
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a href={log.gravacao_url} download>
                          <Download className="w-4 h-4 mr-2" />
                          Download da Gravação
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Log não encontrado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({
  evento,
  referenciaInicio,
  isLast,
}: {
  evento: EventoTimeline;
  referenciaInicio: string;
  isLast: boolean;
}) {
  const Icon = getEventIcon(evento.tipo);
  const timestamp = formatTimestamp(evento.timestamp, referenciaInicio);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="rounded-full bg-primary/10 p-2 border-2 border-primary">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {!isLast && <div className="w-0.5 h-full bg-border my-1" />}
      </div>

      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-xs">
            {timestamp}
          </Badge>
          <span className="font-medium">{evento.descricao}</span>
        </div>

        {evento.dados_adicionais && (
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            {Object.entries(evento.dados_adicionais).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground">└─</span>
                <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
