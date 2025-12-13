import { User, Circle, MessageSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Operador {
  id: string;
  nome: string;
  status_atendimento: 'online' | 'ocupado' | 'pausa' | 'offline';
  conversas_ativas?: number;
  tempo_medio_resposta?: number;
  avatar_url?: string;
}

interface OperadoresPanelProps {
  operadores: Operador[];
  isLoading?: boolean;
}

export function OperadoresPanel({ operadores, isLoading }: OperadoresPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'ocupado': return 'text-amber-500';
      case 'pausa': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Disponível';
      case 'ocupado': return 'Ocupado';
      case 'pausa': return 'Em pausa';
      default: return 'Offline';
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Ordenar por status: online > ocupado > pausa > offline
  const sortedOperadores = [...operadores].sort((a, b) => {
    const order = { online: 0, ocupado: 1, pausa: 2, offline: 3 };
    return (order[a.status_atendimento] || 4) - (order[b.status_atendimento] || 4);
  });

  const stats = {
    online: operadores.filter(o => o.status_atendimento === 'online').length,
    ocupado: operadores.filter(o => o.status_atendimento === 'ocupado').length,
    pausa: operadores.filter(o => o.status_atendimento === 'pausa').length,
    offline: operadores.filter(o => o.status_atendimento === 'offline').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Operadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Operadores
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              {stats.online}
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
              {stats.ocupado}
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
              {stats.pausa}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {sortedOperadores.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhum operador cadastrado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedOperadores.map((operador) => (
                <div
                  key={operador.id}
                  className={cn(
                    'p-3 transition-colors',
                    operador.status_atendimento === 'offline' && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(operador.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                          getStatusColor(operador.status_atendimento),
                          'fill-current'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{operador.nome}</p>
                      <p className={cn('text-xs', getStatusColor(operador.status_atendimento))}>
                        {getStatusLabel(operador.status_atendimento)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {operador.conversas_ativas !== undefined && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{operador.conversas_ativas}</span>
                        </div>
                      )}
                      {operador.tempo_medio_resposta !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{Math.round(operador.tempo_medio_resposta / 60)}m</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
