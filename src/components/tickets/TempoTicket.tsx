import { useEffect, useState } from "react";
import { Clock, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTicketActions } from "@/hooks/useTicketActions";

interface TempoTicketProps {
  ticketId: string;
  estaPausado?: boolean;
}

export function TempoTicket({ ticketId, estaPausado }: TempoTicketProps) {
  const [tempoInfo, setTempoInfo] = useState<any>(null);
  const { calcularTempoEfetivo } = useTicketActions();

  useEffect(() => {
    const buscarTempo = async () => {
      try {
        const info = await calcularTempoEfetivo(ticketId);
        setTempoInfo(info);
      } catch (error) {
        console.error("Erro ao calcular tempo:", error);
      }
    };

    buscarTempo();
    
    // Atualizar a cada minuto
    const interval = setInterval(buscarTempo, 60000);
    return () => clearInterval(interval);
  }, [ticketId]);

  if (!tempoInfo) return null;

  const formatarTempo = (horas: number) => {
    if (horas === 0) return "0m";
    
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4" />
        <span className="font-medium">Tempo em Aberto:</span>
        <span>{formatarTempo(tempoInfo.tempo_total_horas)}</span>
      </div>

      {tempoInfo.tempo_pausado_horas > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pause className="h-4 w-4" />
          <span>Tempo Pausado:</span>
          <span>{formatarTempo(tempoInfo.tempo_pausado_horas)}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Tempo Efetivo:</span>
        <Badge variant="outline" className="font-mono">
          {formatarTempo(tempoInfo.tempo_efetivo_horas)}
        </Badge>
        {estaPausado && (
          <Badge variant="secondary" className="ml-2">
            <Pause className="h-3 w-3 mr-1" />
            Pausado
          </Badge>
        )}
      </div>
    </div>
  );
}
