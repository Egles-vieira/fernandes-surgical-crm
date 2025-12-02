import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GerarLinkConfig {
  validade_dias?: number;
  mostrar_precos?: boolean;
  permitir_aceite?: boolean;
  permitir_recusa?: boolean;
  mensagem_personalizada?: string;
}

export function useGerarLinkProposta(vendaId: string | null) {
  const queryClient = useQueryClient();
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const gerarLinkMutation = useMutation({
    mutationFn: async (config?: GerarLinkConfig) => {
      if (!vendaId) throw new Error("ID da venda não fornecido");

      const { data, error } = await supabase.functions.invoke("gerar-link-proposta", {
        body: { vendaId, config }
      });

      if (error) throw error;
      if (!data?.token) throw new Error("Token não gerado");

      return data.token;
    },
    onSuccess: (token) => {
      const url = `${window.location.origin}/proposal/${token}`;
      setPublicUrl(url);
      
      // Copiar para clipboard
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copiado para a área de transferência!");
      }).catch(() => {
        toast.success("Link gerado com sucesso!");
      });

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["proposta-token", vendaId] });
      queryClient.invalidateQueries({ queryKey: ["proposta-analytics", vendaId] });
    },
    onError: (error: Error) => {
      console.error("Erro ao gerar link:", error);
      toast.error("Erro ao gerar link público");
    }
  });

  const gerarLink = (config?: GerarLinkConfig) => {
    gerarLinkMutation.mutate(config);
  };

  const copiarLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        toast.success("Link copiado!");
      });
    }
  };

  return {
    gerarLink,
    isGenerating: gerarLinkMutation.isPending,
    publicUrl,
    copiarLink,
    setPublicUrl
  };
}
