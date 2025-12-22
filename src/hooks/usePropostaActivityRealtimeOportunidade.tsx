import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePropostaActivityRealtimeOportunidade(oportunidadeId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!oportunidadeId) return;

    const channelName = `proposta-activity-oportunidade-${oportunidadeId}`;

    const channel = supabase
      .channel(channelName)
      // Analytics - nova visualização
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'propostas_analytics',
          filter: `oportunidade_id=eq.${oportunidadeId}`
        },
        (payload) => {
          console.log('📊 Nova visualização da proposta:', payload);
          queryClient.invalidateQueries({ queryKey: ["proposta-analytics-oportunidade", oportunidadeId] });
          
          toast.info("📱 Cliente visualizando proposta", {
            description: "Alguém está olhando sua proposta agora!"
          });
        }
      )
      // Analytics - atualização (tempo de visualização, etc)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'propostas_analytics',
          filter: `oportunidade_id=eq.${oportunidadeId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["proposta-analytics-oportunidade", oportunidadeId] });
        }
      )
      // Cliques
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'propostas_analytics_cliques'
        },
        (payload) => {
          const newClique = payload.new as { tipo_clique?: string };
          queryClient.invalidateQueries({ queryKey: ["proposta-cliques-oportunidade"] });
          
          if (newClique?.tipo_clique === 'aceitar') {
            toast.success("🎯 Cliente clicou em Aceitar!", {
              description: "O cliente demonstrou interesse em aceitar a proposta"
            });
          } else if (newClique?.tipo_clique === 'recusar') {
            toast.warning("⚠️ Cliente clicou em Recusar", {
              description: "O cliente está considerando recusar a proposta"
            });
          }
        }
      )
      // Respostas (aceite/recusa)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'propostas_respostas',
          filter: `oportunidade_id=eq.${oportunidadeId}`
        },
        (payload) => {
          const resposta = payload.new as { tipo_resposta?: string; nome_respondente?: string };
          queryClient.invalidateQueries({ queryKey: ["proposta-respostas-oportunidade", oportunidadeId] });
          
          if (resposta?.tipo_resposta === 'aceita') {
            toast.success("🎉 PROPOSTA ACEITA!", {
              description: resposta.nome_respondente 
                ? `${resposta.nome_respondente} aceitou sua proposta!` 
                : "O cliente aceitou sua proposta!",
              duration: 10000
            });
          } else if (resposta?.tipo_resposta === 'recusada') {
            toast.error("😔 Proposta Recusada", {
              description: resposta.nome_respondente
                ? `${resposta.nome_respondente} recusou a proposta`
                : "O cliente recusou a proposta",
              duration: 10000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [oportunidadeId, queryClient]);
}
