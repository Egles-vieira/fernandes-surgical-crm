import { ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Eye, 
  MousePointer, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Smartphone, 
  Monitor, 
  Tablet,
  ExternalLink,
  Copy,
  TrendingUp
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { usePropostaActivityOportunidade } from "@/hooks/usePropostaActivityOportunidade";
import { usePropostaActivityRealtimeOportunidade } from "@/hooks/usePropostaActivityRealtimeOportunidade";
import { toast } from "sonner";

interface PropostaActivitySheetOportunidadeProps {
  oportunidadeId: string;
  trigger?: ReactNode;
}

// Mapeamento de ícones por tipo de evento
const EVENT_ICONS: Record<string, typeof Eye> = {
  view: Eye,
  click: MousePointer,
  aceita: CheckCircle,
  recusada: XCircle,
};

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// Indicador de interesse baseado no score
function InterestIndicator({ score }: { score: number }) {
  let label = "Baixo";
  let color = "text-muted-foreground";
  
  if (score >= 70) {
    label = "Alto";
    color = "text-green-600";
  } else if (score >= 40) {
    label = "Médio";
    color = "text-yellow-600";
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Interesse do Cliente</span>
        <span className={`font-medium ${color}`}>{label}</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

export function PropostaActivitySheetOportunidade({ 
  oportunidadeId, 
  trigger 
}: PropostaActivitySheetOportunidadeProps) {
  const { data, isLoading, publicUrl, tokenData } = usePropostaActivityOportunidade(oportunidadeId);
  
  // Ativar realtime
  usePropostaActivityRealtimeOportunidade(oportunidadeId);

  // Calcular score de engajamento
  const engajamentoScore = (() => {
    const { analytics, cliques, respostas } = data;
    if (!analytics.length) return 0;
    
    let score = 0;
    
    // Visualizações (até 30 pontos)
    score += Math.min(analytics.length * 10, 30);
    
    // Tempo médio (até 30 pontos)
    const tempoTotal = analytics.reduce((acc, a) => acc + (a.tempo_total_segundos || 0), 0);
    const tempoMedio = tempoTotal / analytics.length;
    score += Math.min(tempoMedio / 2, 30);
    
    // Cliques (até 20 pontos)
    score += Math.min(cliques.length * 5, 20);
    
    // Resposta positiva (20 pontos)
    if (respostas.some(r => r.tipo_resposta === 'aceita')) {
      score += 20;
    }
    
    return Math.min(Math.round(score), 100);
  })();

  // Agregar eventos para timeline
  const eventos = [
    ...data.analytics.map(a => ({
      tipo: 'view' as const,
      data: a.iniciado_em,
      titulo: 'Visualização da proposta',
      descricao: `${a.browser_name || 'Navegador'} • ${a.device_type || 'Desktop'}`,
      icon: EVENT_ICONS.view,
      deviceIcon: DEVICE_ICONS[a.device_type?.toLowerCase() || 'desktop'] || Monitor,
      tempo: a.tempo_total_segundos
    })),
    ...data.cliques.map(c => ({
      tipo: 'click' as const,
      data: c.clicado_em,
      titulo: `Clique: ${c.tipo_acao || 'Elemento'}`,
      descricao: c.elemento_id || 'Ação na proposta',
      icon: EVENT_ICONS.click,
      deviceIcon: null,
      tempo: null
    })),
    ...data.respostas.map(r => ({
      tipo: r.tipo_resposta as 'aceita' | 'recusada',
      data: r.respondido_em,
      titulo: r.tipo_resposta === 'aceita' ? '✅ Proposta Aceita' : '❌ Proposta Recusada',
      descricao: r.nome_respondente 
        ? `Por ${r.nome_respondente}${r.cargo_respondente ? ` (${r.cargo_respondente})` : ''}`
        : 'Resposta registrada',
      icon: r.tipo_resposta === 'aceita' ? EVENT_ICONS.aceita : EVENT_ICONS.recusada,
      deviceIcon: null,
      tempo: null,
      comentario: r.comentario,
      motivoRecusa: r.motivo_recusa
    }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const copiarLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado!");
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Ver Atividade
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Atividade da Proposta
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Link público */}
          {publicUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Link Público</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                  {publicUrl}
                </code>
                <Button variant="ghost" size="icon" onClick={copiarLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => window.open(publicUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {data.analytics.length}
              </div>
              <div className="text-xs text-muted-foreground">Visualizações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {data.analytics.length > 0 
                  ? Math.round(
                      data.analytics.reduce((acc, a) => acc + (a.tempo_total_segundos || 0), 0) / 
                      data.analytics.length
                    )
                  : 0}s
              </div>
              <div className="text-xs text-muted-foreground">Tempo Médio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {engajamentoScore}%
              </div>
              <div className="text-xs text-muted-foreground">Engajamento</div>
            </div>
          </div>

          {/* Indicador de interesse */}
          <InterestIndicator score={engajamentoScore} />

          <Separator />

          {/* Timeline de eventos */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Timeline</p>
            
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : eventos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma atividade registrada</p>
                  <p className="text-xs">Compartilhe o link para começar a rastrear</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {eventos.map((evento, index) => {
                    const Icon = evento.icon;
                    const DeviceIcon = evento.deviceIcon;
                    
                    return (
                      <div 
                        key={`${evento.tipo}-${index}`} 
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center shrink-0
                          ${evento.tipo === 'aceita' ? 'bg-green-100 text-green-600' : ''}
                          ${evento.tipo === 'recusada' ? 'bg-red-100 text-red-600' : ''}
                          ${evento.tipo === 'view' ? 'bg-blue-100 text-blue-600' : ''}
                          ${evento.tipo === 'click' ? 'bg-yellow-100 text-yellow-600' : ''}
                        `}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{evento.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {evento.descricao}
                          </p>
                          {evento.tempo && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{evento.tempo}s na página</span>
                            </div>
                          )}
                          {'comentario' in evento && evento.comentario && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{evento.comentario}"
                            </p>
                          )}
                          {'motivoRecusa' in evento && evento.motivoRecusa && (
                            <p className="text-xs text-destructive mt-1">
                              Motivo: {evento.motivoRecusa}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(evento.data), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                          {DeviceIcon && (
                            <DeviceIcon className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
