import { useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  KPICard, 
  FilaEsperaPanel, 
  OperadoresPanel, 
  SLAGauge,
  MetricasTempoReal,
  NPSIndicator
} from '@/components/whatsapp/bam';
import { useWhatsAppBAM } from '@/hooks/useWhatsAppBAM';

export default function BAMDashboard() {
  const {
    metricas,
    filaEspera,
    operadores,
    isLoadingMetricas,
    refreshMetricas,
    distribuirProximaConversa,
    isSupervisor,
  } = useWhatsAppBAM();

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMetricas();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshMetricas]);

  if (!isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Este dashboard é exclusivo para supervisores e administradores.
        </p>
      </div>
    );
  }

  // Mapear filaEspera para o formato esperado pelo componente
  const conversasFila = (filaEspera || []).map((item: any) => ({
    id: item.id,
    contato_nome: item.contato_nome,
    contato_telefone: item.contato_telefone,
    entrou_fila_em: item.entrou_fila_em,
    prioridade: item.prioridade,
    motivo_prioridade: item.motivo_prioridade,
  }));

  // Mapear operadores para o formato esperado
  const operadoresFormatados = (operadores || []).map((op: any) => ({
    id: op.id,
    nome: op.nome || op.nome_completo || 'Operador',
    status_atendimento: op.status_atendimento || 'offline',
    conversas_ativas: op.conversas_ativas || 0,
    tempo_medio_resposta: op.tempo_medio_resposta,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Activity Monitor</h1>
          <p className="text-muted-foreground text-sm">
            Monitoramento em tempo real do atendimento WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Ao vivo
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMetricas()}
            disabled={isLoadingMetricas}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMetricas ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Na Fila"
          value={metricas.totalNaFila}
          icon={<Clock className="h-5 w-5" />}
          variant={metricas.totalNaFila > 10 ? 'danger' : metricas.totalNaFila > 5 ? 'warning' : 'success'}
          subtitle="aguardando atendimento"
        />
        <KPICard
          title="Em Atendimento"
          value={metricas.atendimentosEmAndamento}
          icon={<MessageSquare className="h-5 w-5" />}
          variant="default"
          subtitle="conversas ativas"
        />
        <KPICard
          title="Atendimentos Hoje"
          value={metricas.atendimentosHoje}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="default"
          subtitle="total do dia"
        />
        <KPICard
          title="Operadores Online"
          value={`${metricas.operadoresOnline}/${metricas.operadoresOnline + metricas.operadoresOcupados + metricas.operadoresEmPausa + metricas.operadoresOffline}`}
          icon={<Users className="h-5 w-5" />}
          variant={metricas.operadoresOnline === 0 ? 'danger' : 'success'}
          subtitle="disponíveis agora"
        />
      </div>

      {/* Métricas em Tempo Real */}
      <MetricasTempoReal
        tma={metricas.tma}
        tempoMedioEspera={metricas.tempoMedioEspera}
        maiorTempoEspera={metricas.maiorTempoEspera}
        atendimentosEmAndamento={metricas.atendimentosEmAndamento}
        atendimentosHoje={metricas.atendimentosHoje}
      />

      {/* Grid Principal */}
      <div className="grid grid-cols-3 gap-6">
        {/* Coluna 1: Fila de Espera */}
        <FilaEsperaPanel
          conversas={conversasFila}
          onDistribuir={() => distribuirProximaConversa?.()}
          isLoading={isLoadingMetricas}
        />

        {/* Coluna 2: Operadores */}
        <OperadoresPanel
          operadores={operadoresFormatados}
          isLoading={isLoadingMetricas}
        />

        {/* Coluna 3: SLA e NPS */}
        <div className="space-y-4">
          <SLAGauge
            percentual={metricas.dentroSLA}
            violacoes={metricas.violacoesSLA}
            meta={95}
          />
          <NPSIndicator
            promotores={metricas.conversasPromotoras}
            neutros={metricas.conversasNeutras}
            detratores={metricas.conversasDetratoras}
          />
        </div>
      </div>
    </div>
  );
}
