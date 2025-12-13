import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLAGaugeProps {
  percentual: number;
  violacoes: number;
  meta?: number;
}

export function SLAGauge({ percentual, violacoes, meta = 95 }: SLAGaugeProps) {
  const getColor = () => {
    if (percentual >= meta) return 'text-green-500';
    if (percentual >= meta - 10) return 'text-amber-500';
    return 'text-red-500';
  };

  const getBackgroundColor = () => {
    if (percentual >= meta) return 'bg-green-500';
    if (percentual >= meta - 10) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Calcular ângulo para o gauge (0-180 graus)
  const angle = Math.min(180, (percentual / 100) * 180);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          SLA de Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Gauge Visual */}
          <div className="relative w-32 h-16 overflow-hidden">
            <div className="absolute inset-0 bg-muted rounded-t-full" />
            <div
              className={cn('absolute inset-0 rounded-t-full origin-bottom', getBackgroundColor())}
              style={{
                clipPath: `polygon(50% 100%, 0 100%, 0 0, 50% 0, 50% 100%)`,
                transform: `rotate(${angle}deg)`,
              }}
            />
            <div className="absolute inset-2 bg-background rounded-t-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <span className={cn('text-2xl font-bold', getColor())}>
                {percentual.toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Info */}
          <div className="mt-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              Meta: {meta}%
            </p>
            {violacoes > 0 && (
              <p className="text-xs text-red-500">
                {violacoes} violações hoje
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
