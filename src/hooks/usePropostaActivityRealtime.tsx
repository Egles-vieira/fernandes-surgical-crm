import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePropostaActivityRealtime(vendaId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!vendaId) return;

    const channel = supabase
      .channel(`proposta-activity-${vendaId}`)
      // Escutar novas visualizações
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'propostas_analytics',
          filter: `venda_id=eq.${vendaId}`
        },
        (payload) => {
          console.log('🔔 Nova visualização:', payload);
          
          // Invalidar cache
          queryClient.invalidateQueries({ 
            queryKey: ['proposta-analytics', vendaId] 
          });
          
          // Mostrar toast
          const deviceType = (payload.new as any).device_type || 'dispositivo';
          toast.info('🔔 Cliente visualizando a proposta!', {
            description: `Device: ${deviceType}`,
            duration: 5000
          });
        }
      )
      // Escutar atualizações de analytics (tempo)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'propostas_analytics',
          filter: `venda_id=eq.${vendaId}`
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['proposta-analytics', vendaId] 
          });
        }
      )
      // Escutar novos cliques (FILTRADO por venda_id para escala)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'propostas_analytics_cliques',
          filter: `venda_id=eq.${vendaId}` // FILTRO CRÍTICO: escuta apenas cliques desta venda
        },
        (payload) => {
          const tipoAcao = (payload.new as any).tipo_acao;
          
          // Invalidar cache
          queryClient.invalidateQueries({ 
            queryKey: ['proposta-cliques', vendaId] 
          });
          
          // Mostrar toast para ações importantes
          if (tipoAcao === 'aceitar_click') {
            toast.success('🎉 Cliente clicou em ACEITAR!', {
              duration: 10000
            });
          } else if (tipoAcao === 'recusar_click') {
            toast.warning('⚠️ Cliente clicou em RECUSAR', {
              duration: 10000
            });
          }
        }
      )
      // Escutar respostas
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'propostas_respostas',
          filter: `venda_id=eq.${vendaId}`
        },
        (payload) => {
          const tipoResposta = (payload.new as any).tipo_resposta;
          
          queryClient.invalidateQueries({ 
            queryKey: ['proposta-respostas', vendaId] 
          });
          
          if (tipoResposta === 'aceita') {
            toast.success('🎉 PROPOSTA ACEITA PELO CLIENTE!', {
              description: 'O cliente confirmou o aceite da proposta.',
              duration: 15000
            });
          } else if (tipoResposta === 'recusada') {
            toast.error('Proposta recusada pelo cliente', {
              description: (payload.new as any).motivo_recusa || 'Sem motivo informado',
              duration: 15000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendaId, queryClient]);
}
