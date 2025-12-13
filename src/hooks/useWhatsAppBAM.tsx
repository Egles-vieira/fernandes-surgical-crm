import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppContext } from '@/contexts/WhatsAppContext';

export interface BAMMetricas {
  // Fila
  totalNaFila: number;
  tempoMedioEspera: number; // segundos
  maiorTempoEspera: number; // segundos
  
  // Atendimentos
  atendimentosHoje: number;
  atendimentosEmAndamento: number;
  tma: number; // Tempo Médio de Atendimento em segundos
  
  // Operadores
  operadoresOnline: number;
  operadoresOcupados: number;
  operadoresEmPausa: number;
  operadoresOffline: number;
  
  // SLA
  dentroSLA: number; // percentual
  violacoesSLA: number;
  
  // Sentimento (se houver análise de IA)
  conversasDetratoras: number;
  conversasNeutras: number;
  conversasPromotoras: number;
}

/**
 * Hook para Business Activity Monitoring (BAM) do WhatsApp.
 * Fornece métricas em tempo real para supervisores.
 */
export const useWhatsAppBAM = () => {
  const context = useWhatsAppContext();
  
  // Query para métricas do dashboard BAM (usa Materialized View)
  const { data: metricas, isLoading: isLoadingMetricas, refetch: refetchMetricas } = useQuery({
    queryKey: ['whatsapp-bam-metricas'],
    queryFn: async () => {
      // Buscar da Materialized View para performance
      const { data, error } = await supabase
        .from('mv_whatsapp_bam_dashboard')
        .select('*')
        .single();
      
      if (error) {
        // Se MV não existir, calcular manualmente (fallback)
        return calcularMetricasManualmente();
      }
      
      return data as BAMMetricas;
    },
    staleTime: 30 * 1000, // 30 segundos
    enabled: context.isSupervisor,
  });

  // Fallback: calcular métricas manualmente se MV não existir
  const calcularMetricasManualmente = async (): Promise<BAMMetricas> => {
    const hoje = new Date().toISOString().split('T')[0];
    
    // Total na fila
    const { count: totalNaFila } = await supabase
      .from('whatsapp_fila_espera')
      .select('*', { count: 'exact', head: true })
      .is('atribuido_em', null);
    
    // Atendimentos hoje
    const { count: atendimentosHoje } = await supabase
      .from('whatsapp_conversas')
      .select('*', { count: 'exact', head: true })
      .gte('criado_em', hoje);
    
    // Em andamento
    const { count: atendimentosEmAndamento } = await supabase
      .from('whatsapp_conversas')
      .select('*', { count: 'exact', head: true })
      .in('status', ['em_atendimento', 'aguardando_cliente']);
    
    // Operadores por status
    const { data: operadoresData } = await supabase
      .from('perfis_usuario')
      .select('status_atendimento')
      .not('status_atendimento', 'is', null);
    
    const statusCounts = {
      online: 0,
      ocupado: 0,
      pausa: 0,
      offline: 0,
    };
    
    operadoresData?.forEach((op: any) => {
      const status = op.status_atendimento as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });
    
    return {
      totalNaFila: totalNaFila || 0,
      tempoMedioEspera: 0,
      maiorTempoEspera: 0,
      atendimentosHoje: atendimentosHoje || 0,
      atendimentosEmAndamento: atendimentosEmAndamento || 0,
      tma: 0,
      operadoresOnline: statusCounts.online,
      operadoresOcupados: statusCounts.ocupado,
      operadoresEmPausa: statusCounts.pausa,
      operadoresOffline: statusCounts.offline,
      dentroSLA: 100,
      violacoesSLA: 0,
      conversasDetratoras: 0,
      conversasNeutras: 0,
      conversasPromotoras: 0,
    };
  };

  // Query para histórico de métricas (gráficos)
  const { data: historicoMetricas } = useQuery({
    queryKey: ['whatsapp-bam-historico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_metricas_agente')
        .select('*')
        .order('data', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: context.isSupervisor,
  });

  return {
    // Acesso ao contexto principal
    filaEspera: context.filaEspera,
    operadores: context.operadores,
    totalFilaEspera: context.totalFilaEspera,
    
    // Métricas agregadas
    metricas: metricas || {
      totalNaFila: context.totalFilaEspera,
      tempoMedioEspera: 0,
      maiorTempoEspera: 0,
      atendimentosHoje: 0,
      atendimentosEmAndamento: context.minhasConversas.length,
      tma: 0,
      operadoresOnline: context.operadores.filter(o => o.status_atendimento === 'online').length,
      operadoresOcupados: context.operadores.filter(o => o.status_atendimento === 'ocupado').length,
      operadoresEmPausa: context.operadores.filter(o => o.status_atendimento === 'pausa').length,
      operadoresOffline: context.operadores.filter(o => o.status_atendimento === 'offline').length,
      dentroSLA: 100,
      violacoesSLA: 0,
      conversasDetratoras: 0,
      conversasNeutras: 0,
      conversasPromotoras: 0,
    } as BAMMetricas,
    isLoadingMetricas,
    
    // Histórico
    historicoMetricas: historicoMetricas || [],
    
    // Ações
    distribuirProximaConversa: context.distribuirProximaConversa,
    refreshMetricas: refetchMetricas,
    
    // Flags
    isSupervisor: context.isSupervisor,
    isAdmin: context.isAdmin,
  };
};

export default useWhatsAppBAM;
