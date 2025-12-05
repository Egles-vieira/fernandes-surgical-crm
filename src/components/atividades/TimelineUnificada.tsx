import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckSquare, Phone, Users, Mail, MessageCircle, MapPin, 
  RefreshCw, FileText, Clock, StickyNote
} from 'lucide-react';
import { useTimelineUnificada, ItemTimeline } from '@/hooks/useTimelineUnificada';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const icones: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckSquare,
  Phone,
  Users,
  Mail,
  MessageCircle,
  MapPin,
  RefreshCw,
  FileText,
  Clock,
  MessageSquare: StickyNote,
  Circle: Clock
};

interface TimelineUnificadaProps {
  clienteId?: string;
  vendaId?: string;
  limite?: number;
}

export function TimelineUnificada({ clienteId, vendaId, limite = 30 }: TimelineUnificadaProps) {
  const { data: timeline, isLoading } = useTimelineUnificada({
    cliente_id: clienteId,
    venda_id: vendaId,
    limite
  });

  const formatarData = (data: string) => {
    const d = new Date(data);
    if (isToday(d)) {
      return `Hoje às ${format(d, 'HH:mm')}`;
    }
    if (isYesterday(d)) {
      return `Ontem às ${format(d, 'HH:mm')}`;
    }
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getIcon = (iconName: string) => {
    const Icon = icones[iconName] || Clock;
    return Icon;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma interação registrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por data
  const gruposPorData = timeline.reduce((acc, item) => {
    const data = new Date(item.data);
    let chave: string;
    
    if (isToday(data)) {
      chave = 'Hoje';
    } else if (isYesterday(data)) {
      chave = 'Ontem';
    } else {
      chave = format(data, "dd 'de' MMMM", { locale: ptBR });
    }
    
    if (!acc[chave]) {
      acc[chave] = [];
    }
    acc[chave].push(item);
    return acc;
  }, {} as Record<string, ItemTimeline[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Timeline Unificada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(gruposPorData).map(([data, items]) => (
            <div key={data}>
              <div className="text-sm font-medium text-muted-foreground mb-3">
                {data}
              </div>
              <div className="space-y-4 relative">
                {/* Linha vertical */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                {items.map((item, index) => {
                  const Icon = getIcon(item.icone);
                  return (
                    <div key={item.id} className="flex gap-4 relative">
                      {/* Ícone */}
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ backgroundColor: item.cor + '20' }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.cor }} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">{item.titulo}</div>
                            {item.descricao && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {item.descricao}
                              </p>
                            )}
                          </div>
                          {item.status && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{format(new Date(item.data), 'HH:mm')}</span>
                          {item.autor && (
                            <>
                              <span>•</span>
                              <span>{item.autor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
