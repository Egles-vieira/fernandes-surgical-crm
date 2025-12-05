import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, CheckCircle, SkipForward, Phone, Building2, Mail, 
  Calendar, Clock, Target, TrendingUp, AlertTriangle, Sparkles,
  ChevronRight, ArrowLeft, User, FileText
} from 'lucide-react';
import { useFocusZone } from '@/hooks/useFocusZone';
import { useCodigosDisposicao, useAtividades } from '@/hooks/useAtividades';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function FocusZone() {
  const navigate = useNavigate();
  const { 
    atividadeFoco, 
    filaAtividades, 
    estatisticasDia, 
    isLoading,
    pularAtividade,
    iniciarAtividade 
  } = useFocusZone();
  const { concluirAtividade } = useAtividades();
  
  const [modoConclusao, setModoConclusao] = useState(false);
  const [codigoDisposicaoId, setCodigoDisposicaoId] = useState<string>('');
  const [resultadoDescricao, setResultadoDescricao] = useState('');
  const [proximoPasso, setProximoPasso] = useState('');
  const [criarProxima, setCriarProxima] = useState(true);

  const { data: codigosDisposicao } = useCodigosDisposicao(atividadeFoco?.tipo);

  const handleConcluir = async () => {
    if (!atividadeFoco || !codigoDisposicaoId) {
      toast.error('Selecione um código de disposição');
      return;
    }

    const codigo = codigosDisposicao?.find(c => c.id === codigoDisposicaoId);
    if (codigo?.requer_proximo_passo && !proximoPasso.trim()) {
      toast.error('Este código requer a definição de um próximo passo');
      return;
    }

    await concluirAtividade.mutateAsync({
      atividade_id: atividadeFoco.id,
      codigo_disposicao_id: codigoDisposicaoId,
      resultado_descricao: resultadoDescricao,
      proximo_passo: proximoPasso,
      criar_proxima_atividade: criarProxima
    });

    // Reset form
    setModoConclusao(false);
    setCodigoDisposicaoId('');
    setResultadoDescricao('');
    setProximoPasso('');
  };

  const handlePular = () => {
    if (!atividadeFoco) return;
    pularAtividade.mutate({ id: atividadeFoco.id });
  };

  const handleIniciar = () => {
    if (!atividadeFoco) return;
    iniciarAtividade.mutate(atividadeFoco.id);
  };

  const codigoSelecionado = codigosDisposicao?.find(c => c.id === codigoDisposicaoId);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/atividades')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Focus Zone
              </h1>
              <p className="text-muted-foreground">Uma tarefa por vez. Máxima produtividade.</p>
            </div>
          </div>
        </div>

        {/* Estatísticas do Dia */}
        {estatisticasDia && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-500">{estatisticasDia.concluidasHoje}</div>
                <div className="text-sm text-muted-foreground">Concluídas hoje</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">{estatisticasDia.pendentes}</div>
                <div className="text-sm text-muted-foreground">Pendentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-500">{estatisticasDia.atrasadas}</div>
                <div className="text-sm text-muted-foreground">Atrasadas</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Card Principal - Atividade em Foco */}
        {!atividadeFoco ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2">Parabéns! 🎉</h2>
              <p className="text-muted-foreground">
                Você não tem atividades pendentes no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {atividadeFoco.numero_atividade}
                    </Badge>
                    <Badge 
                      className={`text-xs ${
                        atividadeFoco.prioridade === 'critica' ? 'bg-red-500' :
                        atividadeFoco.prioridade === 'alta' ? 'bg-orange-500' :
                        atividadeFoco.prioridade === 'media' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    >
                      {atividadeFoco.prioridade}
                    </Badge>
                    {atividadeFoco.data_vencimento && isPast(new Date(atividadeFoco.data_vencimento)) && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Atrasada
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{atividadeFoco.titulo}</CardTitle>
                  {atividadeFoco.descricao && (
                    <CardDescription className="mt-2">{atividadeFoco.descricao}</CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Score de Prioridade</div>
                  <div className="text-2xl font-bold text-primary">
                    {atividadeFoco.score_prioridade?.toFixed(0) || 0}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Informações do Contexto */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                {atividadeFoco.clientes && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {(atividadeFoco.clientes as any).nome_abrev || (atividadeFoco.clientes as any).nome_emit}
                      </div>
                      {(atividadeFoco.clientes as any).telefone1 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {(atividadeFoco.clientes as any).telefone1}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {atividadeFoco.vendas && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        Proposta {(atividadeFoco.vendas as any).numero_venda}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(atividadeFoco.vendas as any).etapa_pipeline}
                      </div>
                    </div>
                  </div>
                )}
                {atividadeFoco.data_vencimento && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {format(new Date(atividadeFoco.data_vencimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(atividadeFoco.data_vencimento), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modo Conclusão */}
              {modoConclusao ? (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-medium">Concluir Atividade</h3>
                  
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
                    <label className="text-sm font-medium mb-2 block">Descrição do Resultado</label>
                    <Textarea
                      value={resultadoDescricao}
                      onChange={(e) => setResultadoDescricao(e.target.value)}
                      placeholder="Descreva o que aconteceu..."
                      rows={3}
                    />
                  </div>

                  {codigoSelecionado?.requer_proximo_passo && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Próximo Passo *
                        <span className="text-muted-foreground font-normal ml-1">(obrigatório)</span>
                      </label>
                      <Textarea
                        value={proximoPasso}
                        onChange={(e) => setProximoPasso(e.target.value)}
                        placeholder="Defina o próximo passo..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="criarProxima"
                      checked={criarProxima}
                      onChange={(e) => setCriarProxima(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="criarProxima" className="text-sm flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Criar próxima atividade sugerida automaticamente
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setModoConclusao(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleConcluir}
                      disabled={!codigoDisposicaoId || concluirAtividade.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar
                    </Button>
                  </div>
                </div>
              ) : (
                /* Botões de Ação */
                <div className="flex gap-3">
                  {atividadeFoco.status === 'pendente' && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleIniciar}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar
                    </Button>
                  )}
                  <Button 
                    className="flex-1"
                    onClick={() => setModoConclusao(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={handlePular}
                    disabled={pularAtividade.isPending}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Pular
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fila de Próximas */}
        {filaAtividades.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximas na Fila
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filaAtividades.map((atividade, index) => (
                <div 
                  key={atividade.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="text-lg font-bold text-muted-foreground w-6">
                    {index + 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{atividade.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {(atividade.clientes as any)?.nome_abrev}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-primary">
                    {atividade.score_prioridade?.toFixed(0)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
