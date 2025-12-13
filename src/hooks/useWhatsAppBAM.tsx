import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppContext } from '@/contexts/WhatsAppContext';

export interface BAMMetricas {
  totalNaFila: number;
  tempoMedioEspera: number;
  maiorTempoEspera: number;
  atendimentosHoje: number;
  atendimentosEmAndamento: number;
  tma: number;
  operadoresOnline: number;
  operadoresOcupados: number;
  operadoresEmPausa: number;
  operadoresOffline: number;
  dentroSLA: number;
  violacoesSLA: number;
  conversasDetratoras: number;
  conversasNeutras: number;
  conversasPromotoras: number;
}

/**
 * Hook para Business Activity Monitoring (BAM) do WhatsApp.
 */
export const useWhatsAppBAM = () => {
  const context = useWhatsAppContext();

  const { data: metricas, isLoading: isLoadingMetricas, refetch: refetchMetricas } = useQuery({
    queryKey: ['whatsapp-bam-metricas'],
    queryFn: async (): Promise<BAMMetricas> => {
      try {
        // Tentar buscar da Materialized View
        const client = supabase as any;
        const { data, error } = await client
          .from('mv_whatsapp_bam_dashboard')
          .select('*')
          .single();
        
        if (!error && data) {
          return {
            totalNaFila: data.conversas_na_fila || 0,
            tempoMedioEspera: data.tempo_medio_espera || 0,
            maiorTempoEspera: data.maior_tempo_espera || 0,
            atendimentosHoje: data.conversas_hoje || 0,
            atendimentosEmAndamento: data.atendimentos_em_andamento || 0,
            tma: data.tma || 0,
            operadoresOnline: data.operadores_online || 0,
            operadoresOcupados: data.operadores_ocupados || 0,
            operadoresEmPausa: data.operadores_pausa || 0,
            operadoresOffline: data.operadores_offline || 0,
            dentroSLA: data.sla_percentual || 100,
            violacoesSLA: data.violacoes_sla || 0,
            conversasDetratoras: data.conversas_detratores || 0,
            conversasNeutras: data.conversas_neutras || 0,
            conversasPromotoras: data.conversas_promotoras || 0,
          };
        }
      } catch {
        // Fallback: calcular manualmente
      }
      
      // Fallback: valores padrão baseados no contexto
      return {
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
      };
    },
    staleTime: 30 * 1000,
    enabled: context.isSupervisor,
  });

  const { data: historicoMetricas } = useQuery({
    queryKey: ['whatsapp-bam-historico'],
    queryFn: async () => {
      const client = supabase as any;
      const { data } = await client
        .from('whatsapp_metricas_agente')
        .select('*')
        .order('data', { ascending: false })
        .limit(30);
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  const defaultMetricas: BAMMetricas = {
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
  };

  return {
    filaEspera: context.filaEspera,
    operadores: context.operadores,
    totalFilaEspera: context.totalFilaEspera,
    metricas: metricas || defaultMetricas,
    isLoadingMetricas,
    historicoMetricas: historicoMetricas || [],
    distribuirProximaConversa: context.distribuirProximaConversa,
    refreshMetricas: refetchMetricas,
    isSupervisor: context.isSupervisor,
    isAdmin: context.isAdmin,
  };
};

export default useWhatsAppBAM;
