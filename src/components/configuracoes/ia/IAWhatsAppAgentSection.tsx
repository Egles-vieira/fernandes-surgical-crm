import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Settings2, Clock, MessageCircle } from "lucide-react";
import { useWhatsAppContasIA } from "@/hooks/useIAConfiguracoes";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface AgentConfig {
  ativo?: boolean;
  tom_voz?: string;
  limite_respostas_por_conversa?: number;
  horario_funcionamento?: {
    dias: string[];
    inicio: string;
    fim: string;
  };
}

export function IAWhatsAppAgentSection() {
  const navigate = useNavigate();
  const { data: contas, isLoading } = useWhatsAppContasIA();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const tomVozLabels: Record<string, string> = {
    profissional: "Profissional",
    amigavel: "Amigável",
    tecnico: "Técnico",
    casual: "Casual",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">WhatsApp - Agente de Vendas IA</CardTitle>
        </div>
        <CardDescription>
          Gerencie o agente de vendas inteligente para cada conta WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!contas || contas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta WhatsApp configurada.
          </p>
        ) : (
          contas.map((conta) => {
            const config = (conta.agente_ia_config as AgentConfig) || null;
            const isAtivo = conta.agente_vendas_ativo === true;

            return (
              <div
                key={conta.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{conta.nome_exibicao || conta.numero_whatsapp}</p>
                    <p className="text-sm text-muted-foreground">{conta.numero_whatsapp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {isAtivo && config && (
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      {config.tom_voz && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{tomVozLabels[config.tom_voz] || config.tom_voz}</span>
                        </div>
                      )}
                      {config.limite_respostas_por_conversa && (
                        <div className="flex items-center gap-1">
                          <span>Limite: {config.limite_respostas_por_conversa}</span>
                        </div>
                      )}
                      {config.horario_funcionamento && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {config.horario_funcionamento.inicio}-{config.horario_funcionamento.fim}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <Badge variant={isAtivo ? "default" : "secondary"}>
                    {isAtivo ? "Ativo" : "Desativado"}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/configuracoes?tab=whatsapp")}
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}