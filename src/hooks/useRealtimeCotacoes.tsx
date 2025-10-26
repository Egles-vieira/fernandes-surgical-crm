import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeCotacoes = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
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
      .subscribe((status) => {
        console.log("📡 Status do canal realtime:", status);
      });

    return () => {
      console.log("🔌 Desconectando canal realtime");
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
