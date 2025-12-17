import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, MessageSquare, Clock } from "lucide-react";
import { useIAConfiguracoes, useWhatsAppContasIA } from "@/hooks/useIAConfiguracoes";
import { Skeleton } from "@/components/ui/skeleton";

export function IAStatusOverview() {
  const { globalConfig, globalAtivo, ediAtivo, ticketsAtivo, triageAtivo, isLoading } = useIAConfiguracoes();
  const { data: contasWhatsApp } = useWhatsAppContasIA();

  const contasComAgente = contasWhatsApp?.filter((c) => c.agente_vendas_ativo === true) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const statusItems = [
    {
      icon: Brain,
      label: "Provider",
      value: globalConfig?.provider || "DeepSeek",
      status: globalAtivo,
      statusText: globalAtivo ? "Conectado" : "Desativado",
    },
    {
      icon: MessageSquare,
      label: "Agente WhatsApp",
      value: `${contasComAgente.length} conta${contasComAgente.length !== 1 ? "s" : ""}`,
      status: contasComAgente.length > 0,
      statusText: contasComAgente.length > 0 ? "Ativo" : "Nenhum",
    },
    {
      icon: Zap,
      label: "Circuit Breaker",
      value: `${globalConfig?.circuit_breaker?.limite_falhas || 5} falhas`,
      status: true,
      statusText: "Normal",
    },
    {
      icon: Clock,
      label: "Módulos Ativos",
      value: `${[ediAtivo, ticketsAtivo, triageAtivo].filter(Boolean).length}/3`,
      status: true,
      statusText: "Operacional",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statusItems.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </div>
              <Badge variant={item.status ? "default" : "secondary"}>
                {item.statusText}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}