import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GitBranch, Settings2 } from "lucide-react";
import { useIAConfiguracoes, useWhatsAppFilasIA } from "@/hooks/useIAConfiguracoes";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function IATriageSection() {
  const navigate = useNavigate();
  const { triageConfig, triageAtivo, updateConfig, isLoading } = useIAConfiguracoes();
  const { data: filas } = useWhatsAppFilasIA();

  const [temperature, setTemperature] = useState<number>(triageConfig?.temperature || 0.3);

  // Filas com prioridade de triagem configurada
  const filasComTriagem = filas?.filter((f) => f.prioridade_triagem !== null) || [];

  const handleToggle = (checked: boolean) => {
    updateConfig.mutate({
      modulo: "whatsapp_triagem",
      ativo: checked,
    });
  };

  const handleTemperatureChange = () => {
    updateConfig.mutate({
      modulo: "whatsapp_triagem",
      config: {
        ...triageConfig,
        temperature,
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
            <GitBranch className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">WhatsApp - Triagem Inteligente</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="triagem-ativo"
              checked={triageAtivo}
              onCheckedChange={handleToggle}
            />
            <Label htmlFor="triagem-ativo" className="text-sm">
              {triageAtivo ? "Ativo" : "Desativado"}
            </Label>
          </div>
        </div>
        <CardDescription>
          Classificação automática de conversas usando DeepSeek
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground">Modelo</p>
            <p className="font-medium">{triageConfig?.modelo || "deepseek-chat"}</p>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground">Temperature</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-20 h-8"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTemperatureChange}
                disabled={temperature === triageConfig?.temperature}
              >
                Salvar
              </Button>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground">Filas Configuradas</p>
            <p className="font-medium">{filasComTriagem.length} filas</p>
          </div>
        </div>

        {filasComTriagem.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Filas com triagem configurada:</p>
            <div className="flex flex-wrap gap-2">
              {filasComTriagem.map((fila) => (
                <Badge key={fila.id} variant="outline">
                  {fila.nome}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/whatsapp/configuracoes")}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Gerenciar Filas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}