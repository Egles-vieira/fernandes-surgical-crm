import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Edit,
  UserPlus,
  UserMinus,
  Crown,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface HistoricoEquipeTimelineProps {
  equipeId: string;
}

const ICONS_MAP: Record<string, any> = {
  edicao: Edit,
  adicao_membro: UserPlus,
  remocao_membro: UserMinus,
  transferencia_lideranca: Crown,
  desativacao: PowerOff,
  reativacao: Power,
};

const COLORS_MAP: Record<string, string> = {
  edicao: "text-primary",
  adicao_membro: "text-success",
  remocao_membro: "text-destructive",
  transferencia_lideranca: "text-warning",
  desativacao: "text-muted-foreground",
  reativacao: "text-success",
};

export function HistoricoEquipeTimeline({ equipeId }: HistoricoEquipeTimelineProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ["historico-equipe", equipeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_atividades_equipe")
        .select("*")
        .eq("equipe_id", equipeId)
        .order("realizado_em", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!equipeId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {historico.map((item: any, index: number) => {
          const Icon = ICONS_MAP[item.tipo_atividade] || Edit;
          const colorClass = COLORS_MAP[item.tipo_atividade] || "text-muted-foreground";

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
                    <p className="font-medium text-sm">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.realizado_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.tipo_atividade.replace(/_/g, " ")}
                  </Badge>
                </div>

                {/* Detalhes das mudanças */}
                {item.dados_anteriores && item.dados_novos && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    {Object.keys(item.dados_novos).map((key) => {
                      const anterior = item.dados_anteriores[key];
                      const novo = item.dados_novos[key];

                      if (anterior === novo) return null;

                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="line-through text-destructive">
                            {String(anterior || "—")}
                          </span>
                          <span>→</span>
                          <span className="text-success font-medium">
                            {String(novo || "—")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
