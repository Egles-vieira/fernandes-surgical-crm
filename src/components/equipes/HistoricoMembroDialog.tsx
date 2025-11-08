import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Briefcase,
  Gauge,
  Loader2,
  Calendar,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface HistoricoMembroDialogProps {
  usuarioId: string;
  usuarioEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICONS_MAP: Record<string, any> = {
  entrada: UserPlus,
  saida: UserMinus,
  transferencia_destino: ArrowRightLeft,
  transferencia_origem: ArrowRightLeft,
  mudanca_papel: Briefcase,
  mudanca_carga: Gauge,
};

const COLORS_MAP: Record<string, string> = {
  entrada: "text-success",
  saida: "text-destructive",
  transferencia_destino: "text-primary",
  transferencia_origem: "text-primary",
  mudanca_papel: "text-warning",
  mudanca_carga: "text-info",
};

export function HistoricoMembroDialog({
  usuarioId,
  usuarioEmail,
  open,
  onOpenChange,
}: HistoricoMembroDialogProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ["historico-membro", usuarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_membros_equipe")
        .select(`
          *,
          equipe:equipes!historico_membros_equipe_equipe_id_fkey(nome),
          equipe_origem:equipes!historico_membros_equipe_equipe_origem_id_fkey(nome),
          equipe_destino:equipes!historico_membros_equipe_equipe_destino_id_fkey(nome)
        `)
        .eq("usuario_id", usuarioId)
        .order("realizado_em", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!usuarioId && open,
  });

  const getTipoEventoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada: "Entrada na Equipe",
      saida: "Saída da Equipe",
      transferencia_destino: "Transferido Para",
      transferencia_origem: "Transferido De",
      mudanca_papel: "Mudança de Papel",
      mudanca_carga: "Mudança de Carga",
    };
    return labels[tipo] || tipo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico do Membro</DialogTitle>
          <DialogDescription>{usuarioEmail}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !historico || historico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum histórico registrado para este membro.
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {historico.map((item: any, index: number) => {
                const Icon = ICONS_MAP[item.tipo_evento] || Calendar;
                const colorClass = COLORS_MAP[item.tipo_evento] || "text-muted-foreground";

                return (
                  <div key={item.id} className="flex gap-4 relative">
                    {/* Linha conectora */}
                    {index < historico.length - 1 && (
                      <div className="absolute left-[15px] top-10 bottom-0 w-[2px] bg-border" />
                    )}

                    {/* Ícone */}
                    <div className={`flex-shrink-0 mt-1 ${colorClass}`}>
                      <div className="bg-card border rounded-full p-2">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {getTipoEventoLabel(item.tipo_evento)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(item.realizado_em), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.equipe?.nome || "N/A"}
                        </Badge>
                      </div>

                      {/* Detalhes específicos por tipo */}
                      <div className="mt-2 space-y-2 text-sm">
                        {item.tipo_evento === "entrada" && (
                          <p className="text-muted-foreground">
                            Entrou na equipe <strong>{item.equipe?.nome}</strong>
                          </p>
                        )}

                        {item.tipo_evento === "saida" && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground">
                              Permaneceu <strong>{item.dias_na_equipe} dias</strong> na equipe
                            </p>
                            {item.motivo && (
                              <p className="text-xs bg-muted/50 p-2 rounded">
                                Motivo: {item.motivo}
                              </p>
                            )}
                          </div>
                        )}

                        {item.tipo_evento === "transferencia_destino" && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground">
                              De <strong>{item.equipe_origem?.nome}</strong> →{" "}
                              <strong>{item.equipe_destino?.nome}</strong>
                            </p>
                            {item.papel_anterior !== item.papel_novo && (
                              <p className="text-xs">
                                Papel: <span className="line-through">{item.papel_anterior}</span> →{" "}
                                <span className="text-success font-medium">{item.papel_novo}</span>
                              </p>
                            )}
                            {item.motivo && (
                              <p className="text-xs bg-muted/50 p-2 rounded">{item.motivo}</p>
                            )}
                          </div>
                        )}

                        {item.tipo_evento === "mudanca_papel" && (
                          <p className="text-sm">
                            <span className="line-through text-muted-foreground">
                              {item.papel_anterior || "Não definido"}
                            </span>{" "}
                            → <span className="text-success font-medium">{item.papel_novo}</span>
                          </p>
                        )}

                        {item.tipo_evento === "mudanca_carga" && (
                          <p className="text-sm">
                            <span className="line-through text-muted-foreground">
                              {item.carga_trabalho_anterior}%
                            </span>{" "}
                            →{" "}
                            <span className="text-primary font-medium">
                              {item.carga_trabalho_nova}%
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
