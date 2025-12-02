import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Truck, 
  ExternalLink, 
  Package, 
  Calendar, 
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw
} from "lucide-react";
import { useVendasEntregas, VendaEntrega } from "@/hooks/useVendasEntregas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EntregasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
}

const statusConfig: Record<VendaEntrega['status_entrega'], { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
  color: string;
}> = {
  pendente: { 
    label: 'Pendente', 
    variant: 'secondary',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-muted-foreground'
  },
  em_transito: { 
    label: 'Em Trânsito', 
    variant: 'default',
    icon: <Truck className="h-3.5 w-3.5" />,
    color: 'text-primary'
  },
  entregue: { 
    label: 'Entregue', 
    variant: 'outline',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'text-success'
  },
  devolvido: { 
    label: 'Devolvido', 
    variant: 'destructive',
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    color: 'text-warning'
  },
  cancelado: { 
    label: 'Cancelado', 
    variant: 'destructive',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-destructive'
  },
};

export function EntregasDialog({ open, onOpenChange, vendaId }: EntregasDialogProps) {
  const { data: entregas, isLoading } = useVendasEntregas(vendaId);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Entregas
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-4 p-1">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !entregas || entregas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma entrega registrada</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                As entregas aparecerão aqui após o faturamento
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {entregas.map((entrega) => {
                const status = statusConfig[entrega.status_entrega];
                return (
                  <div 
                    key={entrega.id} 
                    className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full bg-muted ${status.color}`}>
                            {status.icon}
                          </div>
                          <div>
                            <p className="font-medium">
                              {entrega.transportadora_nome || 'Transportadora não informada'}
                            </p>
                            {entrega.codigo_rastreio && (
                              <p className="text-sm text-muted-foreground">
                                Rastreio: <span className="font-mono">{entrega.codigo_rastreio}</span>
                              </p>
                            )}
                          </div>
                          <Badge variant={status.variant} className="ml-auto">
                            {status.label}
                          </Badge>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Previsão: {formatDate(entrega.data_previsao)}</span>
                          </div>
                          {entrega.data_entrega && (
                            <div className="flex items-center gap-1.5 text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Entregue: {formatDate(entrega.data_entrega)}</span>
                            </div>
                          )}
                          {entrega.volumes && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Package className="h-3.5 w-3.5" />
                              <span>{entrega.volumes} volume(s)</span>
                            </div>
                          )}
                          {entrega.peso_kg && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span>{entrega.peso_kg} kg</span>
                            </div>
                          )}
                        </div>

                        {/* Observations */}
                        {entrega.observacoes && (
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                            {entrega.observacoes}
                          </p>
                        )}
                      </div>

                      {/* Track Button */}
                      {entrega.url_rastreio && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(entrega.url_rastreio!, '_blank')}
                        >
                          <MapPin className="h-4 w-4 mr-1.5" />
                          Rastrear
                          <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Button>
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
