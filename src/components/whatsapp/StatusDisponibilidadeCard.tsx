import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDisponibilidadeVendedor } from "@/hooks/useDisponibilidadeVendedor";
import { Clock, Users, Save } from "lucide-react";
import { useState, useEffect } from "react";

export function StatusDisponibilidadeCard() {
  const { config, isLoading, atualizarDisponibilidade, isAtualizando, toggleDisponibilidade } = useDisponibilidadeVendedor();
  
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("18:00");
  const [maxConversas, setMaxConversas] = useState(5);

  useEffect(() => {
    if (config) {
      setHorarioInicio(config.horario_trabalho_inicio.slice(0, 5));
      setHorarioFim(config.horario_trabalho_fim.slice(0, 5));
      setMaxConversas(config.max_conversas_simultaneas);
    }
  }, [config]);

  const handleSalvar = () => {
    atualizarDisponibilidade({
      horario_trabalho_inicio: horarioInicio,
      horario_trabalho_fim: horarioFim,
      max_conversas_simultaneas: maxConversas,
    });
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6">Carregando...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidade para Atendimento</CardTitle>
        <CardDescription>
          Configure sua disponibilidade para receber conversas do WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Status de Disponibilidade</Label>
            <p className="text-sm text-muted-foreground">
              {config?.esta_disponivel ? "Disponível para receber conversas" : "Indisponível no momento"}
            </p>
          </div>
          <Switch
            checked={config?.esta_disponivel}
            onCheckedChange={toggleDisponibilidade}
            disabled={isAtualizando}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="horario-inicio">
              <Clock className="w-4 h-4 inline mr-2" />
              Horário de Início
            </Label>
            <Input
              id="horario-inicio"
              type="time"
              value={horarioInicio}
              onChange={(e) => setHorarioInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horario-fim">
              <Clock className="w-4 h-4 inline mr-2" />
              Horário de Término
            </Label>
            <Input
              id="horario-fim"
              type="time"
              value={horarioFim}
              onChange={(e) => setHorarioFim(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-conversas">
            <Users className="w-4 h-4 inline mr-2" />
            Máximo de Conversas Simultâneas
          </Label>
          <Input
            id="max-conversas"
            type="number"
            min={1}
            max={50}
            value={maxConversas}
            onChange={(e) => setMaxConversas(parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Número máximo de conversas que você pode atender ao mesmo tempo
          </p>
        </div>

        <Button onClick={handleSalvar} disabled={isAtualizando} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isAtualizando ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
