import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeCotacoes = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
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
          console.log("📡 Atualização em tempo real:", payload);
          
          // Invalida todas as queries de cotações para recarregar os dados
          queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
