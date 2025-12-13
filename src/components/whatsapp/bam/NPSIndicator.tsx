import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Meh, Frown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NPSIndicatorProps {
  promotores: number;
  neutros: number;
  detratores: number;
}

export function NPSIndicator({ promotores, neutros, detratores }: NPSIndicatorProps) {
  const total = promotores + neutros + detratores;
  const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;

  const getNPSColor = () => {
    if (nps >= 50) return 'text-green-500';
    if (nps >= 0) return 'text-amber-500';
    return 'text-red-500';
  };

  const getNPSLabel = () => {
    if (nps >= 75) return 'Excelente';
    if (nps >= 50) return 'Muito Bom';
    if (nps >= 0) return 'Bom';
    if (nps >= -50) return 'Ruim';
    return 'Crítico';
  };

  const getPercentual = (valor: number) => {
    if (total === 0) return 0;
    return (valor / total) * 100;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ThumbsUp className="h-4 w-4" />
          Satisfação (NPS)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <span className={cn('text-4xl font-bold', getNPSColor())}>
            {nps > 0 ? '+' : ''}{nps}
          </span>
          <p className={cn('text-sm', getNPSColor())}>{getNPSLabel()}</p>
        </div>

        {/* Barra de distribuição */}
        <div className="h-4 rounded-full overflow-hidden flex mb-4">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${getPercentual(promotores)}%` }}
          />
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${getPercentual(neutros)}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${getPercentual(detratores)}%` }}
          />
        </div>

        {/* Legenda */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Smile className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">Promotores</p>
            <p className="text-sm font-medium">{promotores}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Meh className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground">Neutros</p>
            <p className="text-sm font-medium">{neutros}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Frown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground">Detratores</p>
            <p className="text-sm font-medium">{detratores}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
