import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';

interface JanelaStatus {
  janelaAberta: boolean;
  tempoRestanteMinutos: number;
  janelaFechaEm: Date | null;
  janelaAbertaEm: Date | null;
}

export function useJanela24h(conversaId: string | null) {
  const queryClient = useQueryClient();
  const [tempoRestante, setTempoRestante] = useState<number>(0);

  // Buscar dados da conversa
  const { data: conversaData, isLoading, refetch } = useQuery({
    queryKey: ['janela-24h', conversaId],
    queryFn: async (): Promise<JanelaStatus> => {
      if (!conversaId) {
        return { janelaAberta: false, tempoRestanteMinutos: 0, janelaFechaEm: null, janelaAbertaEm: null };
      }

      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .select('janela_24h_ativa, janela_aberta_em, janela_fecha_em')
        .eq('id', conversaId)
        .single();

      if (error) throw error;

      const agora = new Date();
      const janelaFechaEm = data?.janela_fecha_em ? new Date(data.janela_fecha_em) : null;
      const janelaAbertaEm = data?.janela_aberta_em ? new Date(data.janela_aberta_em) : null;
      
      // Janela está aberta se: tem data de fechamento E essa data é no futuro
      const janelaAberta = janelaFechaEm ? janelaFechaEm > agora : false;
      
      // Calcular tempo restante em minutos
      const tempoRestanteMinutos = janelaAberta && janelaFechaEm 
        ? Math.max(0, Math.floor((janelaFechaEm.getTime() - agora.getTime()) / (1000 * 60)))
        : 0;

      return {
        janelaAberta,
        tempoRestanteMinutos,
        janelaFechaEm,
        janelaAbertaEm,
      };
    },
    enabled: !!conversaId,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch a cada minuto
  });

  // Atualizar countdown local a cada minuto
  useEffect(() => {
    if (!conversaData?.janelaFechaEm) {
      setTempoRestante(0);
      return;
    }

    const calcularTempoRestante = () => {
      const agora = new Date();
      const fechaEm = new Date(conversaData.janelaFechaEm!);
      const minutos = Math.max(0, Math.floor((fechaEm.getTime() - agora.getTime()) / (1000 * 60)));
      setTempoRestante(minutos);
      
      // Se tempo acabou, invalidar query
      if (minutos === 0 && conversaData.janelaAberta) {
        queryClient.invalidateQueries({ queryKey: ['janela-24h', conversaId] });
      }
    };

    calcularTempoRestante();
    const interval = setInterval(calcularTempoRestante, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [conversaData?.janelaFechaEm, conversaData?.janelaAberta, conversaId, queryClient]);

  // Listener Realtime para mudanças na conversa (filtrado por ID)
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`janela-24h-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversas',
          filter: `id=eq.${conversaId}`,
        },
        (payload) => {
          // Quando conversa é atualizada, refetch status da janela
          if (payload.new.janela_fecha_em !== payload.old?.janela_fecha_em) {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, refetch]);

  // Formatar tempo restante para exibição
  const formatarTempoRestante = useCallback((minutos: number): string => {
    if (minutos <= 0) return 'Expirada';
    
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  }, []);

  return {
    janelaAberta: conversaData?.janelaAberta ?? false,
    tempoRestanteMinutos: tempoRestante,
    tempoRestanteFormatado: formatarTempoRestante(tempoRestante),
    janelaFechaEm: conversaData?.janelaFechaEm ?? null,
    isLoading,
    refetch,
  };
}
