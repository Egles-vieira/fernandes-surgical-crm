import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Eye, Clock, MousePointer, Monitor, Smartphone, Tablet, CheckCircle, XCircle, Download, MessageCircle, DollarSign, FileText, ExternalLink, Copy, Loader2 } from "lucide-react";
import { usePropostaActivity } from "@/hooks/usePropostaActivity";
import { usePropostaActivityRealtime } from "@/hooks/usePropostaActivityRealtime";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface PropostaActivitySheetProps {
  vendaId: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'visualizacao': <Eye className="h-4 w-4 text-blue-500" />,
  'download_pdf': <Download className="h-4 w-4 text-purple-500" />,
  'whatsapp_click': <MessageCircle className="h-4 w-4 text-green-500" />,
  'aceitar_click': <CheckCircle className="h-4 w-4 text-green-600" />,
  'recusar_click': <XCircle className="h-4 w-4 text-red-500" />,
  'secao_precos': <DollarSign className="h-4 w-4 text-amber-500" />,
  'secao_termos': <FileText className="h-4 w-4 text-slate-500" />,
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  'mobile': <Smartphone className="h-3 w-3" />,
  'tablet': <Tablet className="h-3 w-3" />,
  'desktop': <Monitor className="h-3 w-3" />,
};

function InterestIndicator({ score }: { score: number }) {
  const level = score >= 80 ? 'alto' : score >= 50 ? 'medio' : 'baixo';
  
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Nível de Interesse</span>
        <Badge className={
          level === 'alto' ? 'bg-green-500' : 
          level === 'medio' ? 'bg-amber-500' : 
          'bg-slate-400'
        }>
          {level === 'alto' && '🔥 Alto'}
          {level === 'medio' && '⚡ Médio'}
          {level === 'baixo' && '❄️ Baixo'}
        </Badge>
      </div>
      
      <Progress value={score} className="h-2" />
      
      <p className="mt-3 text-xs text-muted-foreground">
        {score >= 80 && "Cliente demonstrou alto interesse! Visto múltiplas vezes e passou tempo na seção de preços."}
        {score >= 50 && score < 80 && "Cliente visualizou a proposta com interesse moderado."}
        {score < 50 && "Baixo engajamento. Considere fazer follow-up."}
      </p>
    </Card>
  );
}

export function PropostaActivitySheet({ vendaId }: PropostaActivitySheetProps) {
  const { data, isLoading, publicToken, publicUrl } = usePropostaActivity(vendaId);
  usePropostaActivityRealtime(vendaId);

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado!');
    }
  };

  const totalVisualizacoes = data?.analytics?.length || 0;
  const tempoTotal = data?.analytics?.reduce((sum, a) => sum + (a.tempo_total_segundos || 0), 0) || 0;
  const tempoMedio = totalVisualizacoes > 0 ? Math.round(tempoTotal / totalVisualizacoes / 60) : 0;
  
  // Calcular score de engajamento
  const engajamentoScore = Math.min(100, 
    (totalVisualizacoes * 20) + 
    (tempoMedio * 5) + 
    (data?.cliques?.length || 0) * 10
  );

  // Montar timeline de atividades
  const atividades = [
    // Visualizações
    ...(data?.analytics?.map(a => ({
      id: `view-${a.id}`,
      tipo: 'visualizacao',
      titulo: 'Visualizou a proposta',
      descricao: `${a.device_type || 'Dispositivo'} - ${a.browser_name || 'Browser'}`,
      data: new Date(a.iniciado_em),
      device: a.device_type,
      browser: a.browser_name,
      tempoSegundos: a.tempo_total_segundos
    })) || []),
    // Cliques
    ...(data?.cliques?.map(c => ({
      id: `click-${c.id}`,
      tipo: c.tipo_acao,
      titulo: c.tipo_acao === 'aceitar_click' ? 'Clicou em Aceitar' :
              c.tipo_acao === 'recusar_click' ? 'Clicou em Recusar' :
              c.tipo_acao === 'download_pdf' ? 'Baixou PDF' :
              c.tipo_acao === 'whatsapp_click' ? 'Clicou WhatsApp' :
              `Clique: ${c.tipo_acao}`,
      descricao: c.elemento_id || '',
      data: new Date(c.clicado_em),
      device: null,
      browser: null
    })) || []),
    // Respostas
    ...(data?.respostas?.map(r => ({
      id: `resp-${r.id}`,
      tipo: r.tipo_resposta === 'aceita' ? 'aceitar_click' : 'recusar_click',
      titulo: r.tipo_resposta === 'aceita' ? '✅ Proposta ACEITA' : '❌ Proposta RECUSADA',
      descricao: r.nome_respondente ? `Por: ${r.nome_respondente}` : 
                 r.motivo_recusa ? `Motivo: ${r.motivo_recusa}` : '',
      data: new Date(r.respondido_em),
      device: null,
      browser: null,
      isResposta: true
    })) || [])
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Atividade
          {totalVisualizacoes > 0 && (
            <Badge variant="secondary" className="ml-1">
              {totalVisualizacoes}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade na Proposta
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Link público */}
          {publicToken && (
            <Card className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Link público</p>
                  <p className="text-xs font-mono truncate">{publicUrl}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{totalVisualizacoes}</div>
              <div className="text-xs text-muted-foreground">Visualizações</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{tempoMedio}min</div>
              <div className="text-xs text-muted-foreground">Tempo Médio</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{engajamentoScore}%</div>
              <div className="text-xs text-muted-foreground">Engajamento</div>
            </Card>
          </div>

          {/* Indicador de interesse */}
          <InterestIndicator score={engajamentoScore} />

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-medium mb-3">Histórico de Atividades</h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : atividades.length === 0 ? (
              <Card className="p-6 text-center">
                <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade registrada ainda
                </p>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-500px)]">
                <div className="space-y-4 pr-4">
                  {atividades.map((atividade) => (
                    <div key={atividade.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-full ${
                          (atividade as any).isResposta ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          {EVENT_ICONS[atividade.tipo] || <Eye className="h-4 w-4" />}
                        </div>
                        <div className="w-px h-full bg-border" />
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${
                            (atividade as any).isResposta ? 'text-primary' : ''
                          }`}>
                            {atividade.titulo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(atividade.data, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        
                        {atividade.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {atividade.descricao}
                          </p>
                        )}
                        
                        {(atividade as any).tempoSegundos && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round((atividade as any).tempoSegundos / 60)}min na página
                          </p>
                        )}
                        
                        {atividade.device && (
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs gap-1">
                              {DEVICE_ICONS[atividade.device]}
                              {atividade.browser}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
