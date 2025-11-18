import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DatasulResponse {
  success: boolean;
  venda_id?: string;
  numero_venda?: string;
  resumo?: {
    total_itens: number;
    tempo_resposta_ms: number;
  };
  datasul_response?: any;
  error?: string;
  details?: string;
}

export function useDatasulCalculaPedido() {
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  const calcularPedido = async (vendaId: string) => {
    if (!vendaId) {
      toast({
        title: "Erro",
        description: "É necessário salvar a venda antes de calcular.",
        variant: "destructive",
      });
      return null;
    }

    setIsCalculating(true);

    try {
      console.log("Chamando edge function para calcular pedido:", vendaId);

      const { data, error } = await supabase.functions.invoke<DatasulResponse>(
        "calcular-pedido-datasul",
        {
          body: { venda_id: vendaId },
        }
      );

      if (error) {
        console.error("Erro ao chamar edge function:", error);
        throw new Error(error.message || "Erro ao calcular pedido");
      }

      if (!data) {
        throw new Error("Nenhum dado retornado do Datasul");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao calcular pedido no Datasul");
      }

      console.log("Resposta Datasul:", data);

      toast({
        title: "Cálculo realizado com sucesso",
        description: `Pedido ${data.numero_venda} calculado em ${data.resumo?.tempo_resposta_ms}ms`,
      });

      return data;
    } catch (error) {
      console.error("Erro ao calcular pedido:", error);
      
      toast({
        title: "Erro ao calcular pedido",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });

      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  return {
    calcularPedido,
    isCalculating,
  };
}
