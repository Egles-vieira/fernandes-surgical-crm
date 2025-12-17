import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Zap } from "lucide-react";
import { useIAConfiguracoes } from "@/hooks/useIAConfiguracoes";
import { Skeleton } from "@/components/ui/skeleton";

export function IAGlobalSettingsSection() {
  const { globalConfig, globalAtivo, updateConfig, isLoading } = useIAConfiguracoes();

  const [limiteFalhas, setLimiteFalhas] = useState<number>(
    globalConfig?.circuit_breaker?.limite_falhas || 5
  );
  const [tempoReset, setTempoReset] = useState<number>(
    globalConfig?.circuit_breaker?.tempo_reset_segundos || 300
  );

  const handleSaveCircuitBreaker = () => {
    updateConfig.mutate({
      modulo: "global",
      config: {
        ...globalConfig,
        circuit_breaker: {
          limite_falhas: limiteFalhas,
          tempo_reset_segundos: tempoReset,
        },
      },
    });
  };

  const hasChanges =
    limiteFalhas !== globalConfig?.circuit_breaker?.limite_falhas ||
    tempoReset !== globalConfig?.circuit_breaker?.tempo_reset_segundos;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Configurações Globais</CardTitle>
        </div>
        <CardDescription>
          Configurações que afetam todos os módulos de IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Provider Principal</p>
              <p className="font-medium text-lg">{globalConfig?.provider || "DeepSeek"}</p>
            </div>
            <Badge variant={globalAtivo ? "default" : "secondary"}>
              {globalAtivo ? "Conectado" : "Desativado"}
            </Badge>
          </div>
        </div>

        {/* Circuit Breaker */}
        <div className="p-4 rounded-lg border space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium">Circuit Breaker</p>
              <p className="text-sm text-muted-foreground">
                Proteção contra falhas consecutivas da API
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limite-falhas">Limite de falhas consecutivas</Label>
              <Input
                id="limite-falhas"
                type="number"
                min="1"
                max="20"
                value={limiteFalhas}
                onChange={(e) => setLimiteFalhas(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Número de falhas antes de abrir o circuito
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempo-reset">Tempo de reset (segundos)</Label>
              <Input
                id="tempo-reset"
                type="number"
                min="60"
                max="3600"
                step="60"
                value={tempoReset}
                onChange={(e) => setTempoReset(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Tempo até tentar reconectar após abertura
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="text-sm">Status atual: Fechado (operando normal)</span>
            </div>
            <Button
              onClick={handleSaveCircuitBreaker}
              disabled={!hasChanges || updateConfig.isPending}
              size="sm"
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
