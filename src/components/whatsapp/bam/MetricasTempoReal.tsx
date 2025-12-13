import { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, MessageSquare, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricaTempoReal {
  label: string;
  valor: number;
  unidade: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface MetricasTempoRealProps {
  tma: number; // Tempo Médio de Atendimento em segundos
  tempoMedioEspera: number; // em segundos
  maiorTempoEspera: number; // em segundos
  atendimentosEmAndamento: number;
  atendimentosHoje: number;
}

export function MetricasTempoReal({
  tma,
  tempoMedioEspera,
  maiorTempoEspera,
  atendimentosEmAndamento,
  atendimentosHoje,
}: MetricasTempoRealProps) {
  const [pulseIndex, setPulseIndex] = useState(0);

  // Animação de pulse para indicar tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % 5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatTempo = (segundos: number) => {
    if (segundos < 60) return `${Math.round(segundos)}s`;
    if (segundos < 3600) return `${Math.round(segundos / 60)}m`;
    return `${Math.round(segundos / 3600)}h`;
  };

  const metricas: MetricaTempoReal[] = [
    {
      label: 'TMA',
      valor: tma,
      unidade: formatTempo(tma),
      trend: tma > 300 ? 'down' : 'up', // >5min é ruim
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: 'Espera Média',
      valor: tempoMedioEspera,
      unidade: formatTempo(tempoMedioEspera),
      trend: tempoMedioEspera > 120 ? 'down' : 'up', // >2min é ruim
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: 'Maior Espera',
      valor: maiorTempoEspera,
      unidade: formatTempo(maiorTempoEspera),
      trend: maiorTempoEspera > 300 ? 'down' : 'neutral', // >5min é ruim
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: 'Em Andamento',
      valor: atendimentosEmAndamento,
      unidade: atendimentosEmAndamento.toString(),
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      label: 'Hoje',
      valor: atendimentosHoje,
      unidade: atendimentosHoje.toString(),
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          Métricas em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          {metricas.map((metrica, index) => (
            <div
              key={metrica.label}
              className={cn(
                'text-center p-3 rounded-lg bg-muted/50 transition-all duration-300',
                pulseIndex === index && 'ring-2 ring-primary/30'
              )}
            >
              <div className="flex justify-center mb-2 text-muted-foreground">
                {metrica.icon}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{metrica.label}</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg font-bold">{metrica.unidade}</span>
                {metrica.trend === 'up' && (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                )}
                {metrica.trend === 'down' && (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
