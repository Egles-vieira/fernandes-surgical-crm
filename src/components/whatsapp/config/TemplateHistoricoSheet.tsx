import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplateHistorico } from "@/hooks/whatsapp/useWhatsAppTemplates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Clock, History } from "lucide-react";

interface TemplateHistoricoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
  templateName: string;
}

function getStatusColor(status: string | null): string {
  if (!status) return 'bg-muted text-muted-foreground';
  
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case 'APPROVED':
    case 'APROVADO':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'PENDING':
    case 'PENDENTE':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'REJECTED':
    case 'REJEITADO':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'PAUSED':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    case 'DISABLED':
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    case 'DELETED':
      return 'bg-red-900/10 text-red-900 border-red-900/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatStatus(status: string | null): string {
  if (!status) return 'Novo';
  
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case 'APPROVED':
    case 'APROVADO':
      return 'Aprovado';
    case 'PENDING':
    case 'PENDENTE':
      return 'Pendente';
    case 'REJECTED':
    case 'REJEITADO':
      return 'Rejeitado';
    case 'PAUSED':
      return 'Pausado';
    case 'DISABLED':
      return 'Desabilitado';
    case 'DELETED':
      return 'Excluído';
    default:
      return status;
  }
}

export function TemplateHistoricoSheet({
  open,
  onOpenChange,
  templateId,
  templateName,
}: TemplateHistoricoSheetProps) {
  const { data: historico, isLoading } = useTemplateHistorico(templateId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Status
          </SheetTitle>
          <SheetDescription>
            Template: <strong>{templateName}</strong>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-6 w-48" />
                </div>
              ))}
            </div>
          ) : !historico?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum histórico encontrado</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {historico.map((item, index) => (
                  <div key={item.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.sincronizado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(item.status_anterior)}>
                          {formatStatus(item.status_anterior)}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className={getStatusColor(item.status_novo)}>
                          {formatStatus(item.status_novo)}
                        </Badge>
                      </div>

                      {item.motivo_rejeicao && (
                        <p className="mt-2 text-sm text-red-600 bg-red-500/10 p-2 rounded">
                          <strong>Motivo:</strong> {item.motivo_rejeicao}
                        </p>
                      )}

                      {item.quality_score?.score && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>Quality Score:</strong> {item.quality_score.score}
                        </div>
                      )}

                      {index === 0 && item.status_anterior === null && (
                        <p className="mt-2 text-xs text-muted-foreground italic">
                          Template criado
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
