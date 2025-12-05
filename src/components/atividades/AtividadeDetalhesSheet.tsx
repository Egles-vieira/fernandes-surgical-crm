import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, Clock, Calendar, User, Building2, Phone, Mail,
  FileText, AlertTriangle, Sparkles, History, MessageSquare, Edit
} from 'lucide-react';
import { useAtividade, useCodigosDisposicao, useAtividades } from '@/hooks/useAtividades';
import { useTimelineUnificada } from '@/hooks/useTimelineUnificada';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface AtividadeDetalhesSheetProps {
  atividadeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtividadeDetalhesSheet({ atividadeId, open, onOpenChange }: AtividadeDetalhesSheetProps) {
  const { data: atividade, isLoading } = useAtividade(atividadeId || undefined);
  const { data: codigosDisposicao } = useCodigosDisposicao(atividade?.tipo);
  const { concluirAtividade, atualizarAtividade } = useAtividades();
  const { data: timeline } = useTimelineUnificada({ 
    cliente_id: atividade?.cliente_id || undefined 
  });

  const [modoConclusao, setModoConclusao] = useState(false);
  const [codigoDisposicaoId, setCodigoDisposicaoId] = useState<string>('');
  const [resultadoDescricao, setResultadoDescricao] = useState('');
  const [proximoPasso, setProximoPasso] = useState('');

  const handleConcluir = async () => {
    if (!atividade || !codigoDisposicaoId) {
      toast.error('Selecione um código de disposição');
      return;
    }

    const codigo = codigosDisposicao?.find(c => c.id === codigoDisposicaoId);
    if (codigo?.requer_proximo_passo && !proximoPasso.trim()) {
      toast.error('Este código requer a definição de um próximo passo');
      return;
    }

    await concluirAtividade.mutateAsync({
      atividade_id: atividade.id,
      codigo_disposicao_id: codigoDisposicaoId,
      resultado_descricao: resultadoDescricao,
      proximo_passo: proximoPasso,
      criar_proxima_atividade: true
    });

    setModoConclusao(false);
    setCodigoDisposicaoId('');
    setResultadoDescricao('');
    setProximoPasso('');
  };

  const codigoSelecionado = codigosDisposicao?.find(c => c.id === codigoDisposicaoId);

  const statusConfig: Record<string, { label: string; cor: string }> = {
    pendente: { label: 'Pendente', cor: 'bg-gray-500' },
    em_andamento: { label: 'Em Andamento', cor: 'bg-blue-500' },
    concluida: { label: 'Concluída', cor: 'bg-green-500' },
    cancelada: { label: 'Cancelada', cor: 'bg-red-500' },
    reagendada: { label: 'Reagendada', cor: 'bg-purple-500' },
    aguardando_resposta: { label: 'Aguardando', cor: 'bg-yellow-500' },
  };

  const prioridadeConfig: Record<string, { label: string; cor: string }> = {
    critica: { label: 'Crítica', cor: 'bg-red-500' },
    alta: { label: 'Alta', cor: 'bg-orange-500' },
    media: { label: 'Média', cor: 'bg-yellow-500' },
    baixa: { label: 'Baixa', cor: 'bg-green-500' },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : atividade ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {atividade.numero_atividade}
                    </Badge>
                    <Badge className={`${statusConfig[atividade.status]?.cor} text-white`}>
                      {statusConfig[atividade.status]?.label}
                    </Badge>
                  </div>
                  <SheetTitle className="text-left">{atividade.titulo}</SheetTitle>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="detalhes" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-6 mt-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${prioridadeConfig[atividade.prioridade]?.cor} text-white`}>
                    {prioridadeConfig[atividade.prioridade]?.label}
                  </Badge>
                  {atividade.data_vencimento && isPast(new Date(atividade.data_vencimento)) && atividade.status !== 'concluida' && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Atrasada
                    </Badge>
                  )}
                  {atividade.nba_sugestao_tipo && (
                    <Badge variant="outline" className="border-primary text-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Sugestão NBA
                    </Badge>
                  )}
                </div>

                {/* Descrição */}
                {atividade.descricao && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Descrição</h4>
                    <p className="text-sm text-muted-foreground">{atividade.descricao}</p>
                  </div>
                )}

                {/* Informações */}
                <div className="space-y-3">
                  {atividade.clientes && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {(atividade.clientes as any).nome_abrev || (atividade.clientes as any).nome_emit}
                        </div>
                        <div className="text-xs text-muted-foreground">Cliente</div>
                      </div>
                    </div>
                  )}

                  {atividade.perfis_usuario && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {(atividade.perfis_usuario as any).primeiro_nome} {(atividade.perfis_usuario as any).sobrenome}
                        </div>
                        <div className="text-xs text-muted-foreground">Responsável</div>
                      </div>
                    </div>
                  )}

                  {atividade.data_vencimento && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {format(new Date(atividade.data_vencimento), "PPP 'às' HH:mm", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(atividade.data_vencimento), { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  )}

                  {atividade.score_prioridade && (
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          Score: {atividade.score_prioridade.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Priorização Algorítmica</div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Resultado (se concluída) */}
                {atividade.status === 'concluida' && atividade.codigos_disposicao && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Resultado
                    </h4>
                    <Badge 
                      style={{ backgroundColor: (atividade.codigos_disposicao as any).cor }}
                      className="text-white mb-2"
                    >
                      {(atividade.codigos_disposicao as any).nome}
                    </Badge>
                    {atividade.resultado_descricao && (
                      <p className="text-sm text-muted-foreground">{atividade.resultado_descricao}</p>
                    )}
                    {atividade.proximo_passo && (
                      <div className="mt-2">
                        <span className="text-xs font-medium">Próximo passo:</span>
                        <p className="text-sm">{atividade.proximo_passo}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ações */}
                {atividade.status !== 'concluida' && atividade.status !== 'cancelada' && (
                  <>
                    {modoConclusao ? (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-medium">Concluir Atividade</h4>
                        
                        <div>
                          <label className="text-sm font-medium mb-2 block">Código de Disposição *</label>
                          <Select value={codigoDisposicaoId} onValueChange={setCodigoDisposicaoId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o resultado" />
                            </SelectTrigger>
                            <SelectContent>
                              {codigosDisposicao?.map(codigo => (
                                <SelectItem key={codigo.id} value={codigo.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: codigo.cor }}
                                    />
                                    {codigo.nome}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Descrição</label>
                          <Textarea
                            value={resultadoDescricao}
                            onChange={(e) => setResultadoDescricao(e.target.value)}
                            placeholder="O que aconteceu..."
                            rows={3}
                          />
                        </div>

                        {codigoSelecionado?.requer_proximo_passo && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Próximo Passo *</label>
                            <Textarea
                              value={proximoPasso}
                              onChange={(e) => setProximoPasso(e.target.value)}
                              placeholder="Defina o próximo passo..."
                              rows={2}
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setModoConclusao(false)} className="flex-1">
                            Cancelar
                          </Button>
                          <Button onClick={handleConcluir} disabled={!codigoDisposicaoId} className="flex-1">
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full" onClick={() => setModoConclusao(true)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Concluir Atividade
                      </Button>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                {timeline && timeline.length > 0 ? (
                  <div className="space-y-4">
                    {timeline.slice(0, 20).map(item => (
                      <div key={item.id} className="flex gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: item.cor + '20' }}
                        >
                          <MessageSquare className="h-4 w-4" style={{ color: item.cor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.titulo}</div>
                          {item.descricao && (
                            <p className="text-xs text-muted-foreground truncate">{item.descricao}</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(item.data), "dd/MM HH:mm")}
                            {item.autor && ` • ${item.autor}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma interação encontrada
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <div className="text-center text-muted-foreground py-8">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Histórico de alterações
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Atividade não encontrada
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
