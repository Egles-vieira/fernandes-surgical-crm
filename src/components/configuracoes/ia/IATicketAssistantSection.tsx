import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Ticket, MessageSquareText } from "lucide-react";
import { useIAConfiguracoes } from "@/hooks/useIAConfiguracoes";
import { Skeleton } from "@/components/ui/skeleton";

export function IATicketAssistantSection() {
  const { ticketsConfig, ticketsAtivo, updateConfig, isLoading } = useIAConfiguracoes();

  const handleToggle = (checked: boolean) => {
    updateConfig.mutate({
      modulo: "tickets_assistente",
      ativo: checked,
    });
  };

  const handleConfigChange = (key: string, value: boolean) => {
    updateConfig.mutate({
      modulo: "tickets_assistente",
      config: {
        ...ticketsConfig,
        [key]: value,
      },
    });
  };

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tickets - Assistente IA</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="tickets-ativo"
              checked={ticketsAtivo}
              onCheckedChange={handleToggle}
            />
            <Label htmlFor="tickets-ativo" className="text-sm">
              {ticketsAtivo ? "Ativo" : "Desativado"}
            </Label>
          </div>
        </div>
        <CardDescription>
          Assistente inteligente para suporte e atendimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground mb-1">Modelo</p>
          <p className="font-medium">{ticketsConfig?.modelo || "deepseek-chat"}</p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium">Sugerir respostas automaticamente</p>
              <p className="text-sm text-muted-foreground">
                A IA sugere respostas baseadas no contexto do ticket
              </p>
            </div>
          </div>
          <Switch
            checked={ticketsConfig?.sugerir_respostas ?? true}
            onCheckedChange={(checked) => handleConfigChange("sugerir_respostas", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
