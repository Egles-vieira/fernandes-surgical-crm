import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Package, Sparkles, AlertCircle } from "lucide-react";
import { useIAConfiguracoes } from "@/hooks/useIAConfiguracoes";
import { Skeleton } from "@/components/ui/skeleton";

export function IAEdiAnalysisSection() {
  const { ediConfig, ediAtivo, updateConfig, isLoading } = useIAConfiguracoes();

  const handleToggle = (checked: boolean) => {
    updateConfig.mutate({
      modulo: "edi_analise",
      ativo: checked,
    });
  };

  const handleConfigChange = (key: string, value: boolean) => {
    updateConfig.mutate({
      modulo: "edi_analise",
      config: {
        ...ediConfig,
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
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">EDI/Plataformas - Análise de Cotações</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="edi-ativo"
              checked={ediAtivo}
              onCheckedChange={handleToggle}
            />
            <Label htmlFor="edi-ativo" className="text-sm">
              {ediAtivo ? "Ativo" : "Desativado"}
            </Label>
          </div>
        </div>
        <CardDescription>
          Análise inteligente de itens de cotação usando DeepSeek
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground mb-1">Modelo</p>
          <p className="font-medium">{ediConfig?.modelo || "deepseek-chat"}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Análise automática de novos itens</p>
                <p className="text-sm text-muted-foreground">
                  Processar itens automaticamente quando uma cotação é recebida
                </p>
              </div>
            </div>
            <Switch
              checked={ediConfig?.analise_automatica ?? true}
              onCheckedChange={(checked) => handleConfigChange("analise_automatica", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Fallback para análise manual</p>
                <p className="text-sm text-muted-foreground">
                  Em caso de erro da IA, marcar item para revisão manual
                </p>
              </div>
            </div>
            <Switch
              checked={ediConfig?.fallback_manual ?? true}
              onCheckedChange={(checked) => handleConfigChange("fallback_manual", checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
