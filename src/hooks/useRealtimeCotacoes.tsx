import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeCotacoes = (enabled: boolean = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    
    console.log("🔌 Iniciando canal realtime para cotações");
    
    const channel = supabase
      .channel("edi_cotacoes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edi_cotacoes",
        },
        (payload) => {
          console.log("📡 Atualização em tempo real em edi_cotacoes:", payload);
          
          // Invalida todas as queries de cotações para recarregar os dados
          queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edi_cotacoes_itens",
        },
        (payload) => {
          console.log("📦 Atualização em tempo real em edi_cotacoes_itens:", payload);
          
          // Invalida queries de cotações quando itens mudarem
          queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
        }
      )
      .on(
        "broadcast",
        { event: "analise-progresso" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("🧠 Progresso de análise IA recebido:", payload);
          const { cotacao_id, percentual, itens_analisados, total_itens } = payload || {};

          // Atualiza cache imediatamente (sem esperar refetch)
          queryClient.setQueriesData({ queryKey: ["edi-cotacoes"] }, (oldData: any) => {
            if (!oldData) return oldData;
            // Suporta múltiplos formatos (array simples ou objeto do react-query)
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

          // NÃO invalida aqui - o cache já foi atualizado
        }
      )
      .on(
        "broadcast",
        { event: "analise-item-concluido" },
        (raw) => {
          const payload: any = (raw as any)?.payload ?? raw;
          console.log("✅ Item analisado:", payload);
          
          // NÃO invalida aqui - evita refetch excessivo
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

          // NÃO invalida aqui - o cache já foi atualizado
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

          // Invalida apenas quando concluir para garantir dados finais corretos
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
          
          // Invalida em caso de erro para recarregar estado correto
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
          }, 1000);
        }
      )
      .subscribe((status) => {
        console.log("📡 Status do canal realtime:", status);
      });

    // Polling muito reduzido - apenas como fallback de segurança
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
    }, 60000); // Aumentado para 60s - realtime já cuida das atualizações

    return () => {
      console.log("🔌 Desconectando canal realtime");
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [queryClient, enabled]);
};
