import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FileText, 
  ExternalLink, 
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileX,
  Download
} from "lucide-react";
import { useVendasNotasFiscais, VendaNotaFiscal } from "@/hooks/useVendasNotasFiscais";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface NotasFiscaisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
}

const statusConfig: Record<VendaNotaFiscal['status'], { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
}> = {
  emitida: { 
    label: 'Emitida', 
    variant: 'default',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  },
  cancelada: { 
    label: 'Cancelada', 
    variant: 'destructive',
    icon: <XCircle className="h-3.5 w-3.5" />
  },
  denegada: { 
    label: 'Denegada', 
    variant: 'destructive',
    icon: <AlertTriangle className="h-3.5 w-3.5" />
  },
  inutilizada: { 
    label: 'Inutilizada', 
    variant: 'secondary',
    icon: <FileX className="h-3.5 w-3.5" />
  },
};

export function NotasFiscaisDialog({ open, onOpenChange, vendaId }: NotasFiscaisDialogProps) {
  const { data: notas, isLoading } = useVendasNotasFiscais(vendaId);

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const copyChaveAcesso = (chave: string) => {
    navigator.clipboard.writeText(chave);
    toast.success('Chave de acesso copiada!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Notas Fiscais
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-4 p-1">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !notas || notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma nota fiscal emitida</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                As notas fiscais aparecerão aqui após emissão
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {notas.map((nota) => {
                const status = statusConfig[nota.status];
                return (
                  <div 
                    key={nota.id} 
                    className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              NF-e {nota.numero_nf}
                              {nota.serie_nf && <span className="text-muted-foreground"> / Série {nota.serie_nf}</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(nota.data_emissao)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {formatCurrency(nota.valor_total)}
                          </span>
                          <Badge variant={status.variant} className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Chave de Acesso */}
                      {nota.chave_acesso && (
                        <div className="flex items-center gap-2 bg-muted/50 rounded p-2">
                          <span className="text-xs text-muted-foreground">Chave:</span>
                          <code className="text-xs font-mono flex-1 truncate">
                            {nota.chave_acesso}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyChaveAcesso(nota.chave_acesso!)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar chave</TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {/* Natureza da Operação */}
                      {nota.natureza_operacao && (
                        <p className="text-sm text-muted-foreground">
                          {nota.natureza_operacao}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {nota.url_danfe && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(nota.url_danfe!, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-1.5" />
                            Ver DANFE
                            <ExternalLink className="h-3 w-3 ml-1.5" />
                          </Button>
                        )}
                        {nota.url_xml && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(nota.url_xml!, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-1.5" />
                            XML
                          </Button>
                        )}
                      </div>

                      {/* Observations */}
                      {nota.observacoes && (
                        <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                          {nota.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
