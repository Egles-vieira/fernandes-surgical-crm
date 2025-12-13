import { Clock, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversaFila {
  id: string;
  contato_nome?: string;
  contato_telefone?: string;
  entrou_fila_em?: string;
  prioridade?: number;
  motivo_prioridade?: string;
}

interface FilaEsperaPanelProps {
  conversas: ConversaFila[];
  onDistribuir?: (conversaId: string) => void;
  isLoading?: boolean;
}

export function FilaEsperaPanel({ conversas, onDistribuir, isLoading }: FilaEsperaPanelProps) {
  const getTempoEspera = (entrou: string | undefined) => {
    if (!entrou) return 'N/A';
    return formatDistanceToNow(new Date(entrou), { locale: ptBR, addSuffix: false });
  };

  const getPrioridadeBadge = (prioridade?: number) => {
    if (!prioridade || prioridade <= 1) return null;
    if (prioridade >= 3) {
      return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Média</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Fila de Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
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
            <Clock className="h-4 w-4" />
            Fila de Espera
          </div>
          <Badge variant="outline">{conversas.length} aguardando</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {conversas.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhuma conversa na fila
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversas.map((conversa) => (
                <div
                  key={conversa.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversa.contato_nome || conversa.contato_telefone || 'Desconhecido'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{getTempoEspera(conversa.entrou_fila_em)}</span>
                          {getPrioridadeBadge(conversa.prioridade)}
                        </div>
                        {conversa.motivo_prioridade && (
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            {conversa.motivo_prioridade}
                          </p>
                        )}
                      </div>
                    </div>
                    {onDistribuir && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        onClick={() => onDistribuir(conversa.id)}
                      >
                        Atribuir
                      </Button>
                    )}
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
