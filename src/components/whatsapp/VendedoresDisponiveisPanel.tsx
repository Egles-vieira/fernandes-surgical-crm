import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVendedoresDisponiveis } from "@/hooks/useVendedoresDisponiveis";
import { UserCheck, UserX, MessageSquare, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VendedoresDisponiveisPanel() {
  const { data: vendedores, isLoading } = useVendedoresDisponiveis();

  if (isLoading) {
    return <Card><CardContent className="pt-6">Carregando vendedores...</CardContent></Card>;
  }

  const vendedoresDisponiveis = vendedores?.filter(v => v.esta_disponivel) || [];
  const vendedoresIndisponiveis = vendedores?.filter(v => !v.esta_disponivel) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipe de Atendimento</CardTitle>
        <CardDescription>
          {vendedoresDisponiveis.length} vendedores disponíveis para atendimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {/* Vendedores Disponíveis */}
            {vendedoresDisponiveis.map((vendedor) => (
              <div
                key={vendedor.user_id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900">
                    <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{vendedor.nome_completo}</p>
                      <Badge variant={vendedor.pode_receber_conversa ? "default" : "secondary"}>
                        {vendedor.pode_receber_conversa ? "Livre" : "Cheio"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {vendedor.conversas_ativas}/{vendedor.max_conversas_simultaneas} conversas
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {vendedor.horario_trabalho_inicio.slice(0, 5)} - {vendedor.horario_trabalho_fim.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {vendedor.conversas_disponiveis} disponível
                  </p>
                </div>
              </div>
            ))}

            {/* Vendedores Indisponíveis */}
            {vendedoresIndisponiveis.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Indisponíveis</h4>
                </div>
                {vendedoresIndisponiveis.map((vendedor) => (
                  <div
                    key={vendedor.user_id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-muted/30 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800">
                        <UserX className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{vendedor.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">Fora de horário ou indisponível</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {vendedores?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum vendedor cadastrado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
