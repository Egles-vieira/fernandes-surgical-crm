import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook de Realtime otimizado para cotações EDI
 * PRIORIDADE 2: Filtro por usuário para evitar broadcast global
 */
export const useRealtimeCotacoes = (enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user?.id) return;
    
    console.log("🔌 Iniciando canal realtime filtrado para cotações (user:", user.id, ")");
    
    // Canal filtrado por usuário - evita broadcast global
    const channel = supabase
      .channel(`edi_cotacoes_user_${user.id}`)
      // Escutar apenas cotações resgatadas pelo usuário atual
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edi_cotacoes",
          filter: `resgatada_por=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Atualização em cotação do usuário:", payload);
          queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
        }
      )
      // Também escutar cotações respondidas pelo usuário
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edi_cotacoes",
          filter: `respondido_por=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Atualização em cotação respondida:", payload);
          queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
        }
      )
      // Broadcast events continuam sem filtro (já são direcionados)
      .on(
        "broadcast",
        { event: "analise-progresso" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("🧠 Progresso de análise IA recebido:", payload);
          const { cotacao_id, percentual, itens_analisados, total_itens } = payload || {};

          queryClient.setQueriesData({ queryKey: ["edi-cotacoes"] }, (oldData: any) => {
            if (!oldData) return oldData;
            const apply = (arr: any[]) =>
              arr?.map((c) =>
                c?.id === cotacao_id
                  ? {
                      ...c,
                      status_analise_ia: "em_analise",
                      progresso_analise_percent: percentual ?? c.progresso_analise_percent,
                      itens_analisados: itens_analisados ?? c.itens_analisados,
                      total_itens_para_analise: total_itens ?? c.total_itens_para_analise ?? c.total_itens,
                    }
                  : c
              );

            if (Array.isArray(oldData)) return apply(oldData);
            if (Array.isArray(oldData?.pages)) {
              return {
                ...oldData,
                pages: oldData.pages.map((p: any) => Array.isArray(p) ? apply(p) : p),
              };
            }
            return oldData;
          });
        }
      )
      .on(
        "broadcast",
        { event: "analise-item-concluido" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("✅ Item analisado:", payload);
        }
      )
      .on(
        "broadcast",
        { event: "analise-iniciada" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("🚀 Análise iniciada:", payload);

          queryClient.setQueriesData({ queryKey: ["edi-cotacoes"] }, (oldData: any) => {
            if (!oldData) return oldData;
            const { cotacao_id, total_itens } = payload || {};
            const apply = (arr: any[]) => arr?.map((c) => c?.id === cotacao_id ? {
              ...c,
              status_analise_ia: "em_analise",
              progresso_analise_percent: 0,
              itens_analisados: 0,
              total_itens_para_analise: total_itens ?? c.total_itens_para_analise ?? c.total_itens,
            } : c);
            if (Array.isArray(oldData)) return apply(oldData);
            if (Array.isArray(oldData?.pages)) {
              return { ...oldData, pages: oldData.pages.map((p: any) => Array.isArray(p) ? apply(p) : p) };
            }
            return oldData;
          });
        }
      )
      .on(
        "broadcast",
        { event: "analise-concluida" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("🏁 Análise concluída:", payload);
          const { cotacao_id, percentual } = payload || {};

          queryClient.setQueriesData({ queryKey: ["edi-cotacoes"] }, (oldData: any) => {
            if (!oldData) return oldData;
            const apply = (arr: any[]) => arr?.map((c) => c?.id === cotacao_id ? {
              ...c,
              status_analise_ia: "concluida",
              progresso_analise_percent: percentual ?? 100,
            } : c);
            if (Array.isArray(oldData)) return apply(oldData);
            if (Array.isArray(oldData?.pages)) {
              return { ...oldData, pages: oldData.pages.map((p: any) => Array.isArray(p) ? apply(p) : p) };
            }
            return oldData;
          });

          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
          }, 2000);
        }
      )
      .on(
        "broadcast",
        { event: "analise-erro" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("❌ Erro na análise:", payload);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
          }, 1000);
        }
      )
      .subscribe((status) => {
        console.log("📡 Status do canal realtime filtrado:", status);
      });

    // Polling reduzido - apenas fallback de segurança
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
    }, 60000);

    return () => {
      console.log("🔌 Desconectando canal realtime filtrado");
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [queryClient, enabled, user?.id]);
};
