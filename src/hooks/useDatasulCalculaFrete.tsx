import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FreteResponse {
  success: boolean;
  valor_frete?: number;
  mensagem?: string;
  error?: string;
  error_code?: string;
  tempo_total_ms?: number;
}

interface FreteErrorData {
  message: string;
  error_code?: string;
  details?: string;
}

export function useDatasulCalculaFrete() {
  const [isCalculatingFrete, setIsCalculatingFrete] = useState(false);
  const [freteErrorData, setFreteErrorData] = useState<FreteErrorData | null>(null);
  const [showFreteErrorDialog, setShowFreteErrorDialog] = useState(false);
  const queryClient = useQueryClient();

  const calcularFrete = async (vendaId: string): Promise<FreteResponse | null> => {
    if (!vendaId) {
      toast.error("ID da venda não informado");
      return null;
    }

    setIsCalculatingFrete(true);
    setFreteErrorData(null);

    try {
      console.log(`[FRETE-HOOK] Iniciando cálculo de frete para venda: ${vendaId}`);

      const { data, error } = await supabase.functions.invoke("calcular-frete-datasul", {
        body: { venda_id: vendaId }
      });

      if (error) {
        console.error("[FRETE-HOOK] Erro na chamada:", error);
        const errorMessage = error.message || "Erro desconhecido ao calcular frete";
        
        setFreteErrorData({
          message: errorMessage,
          error_code: "INVOKE_ERROR"
        });
        
        toast.error("Erro ao calcular frete", {
          description: errorMessage
        });
        
        return {
          success: false,
          error: errorMessage,
          error_code: "INVOKE_ERROR"
        };
      }

      const response = data as FreteResponse;

      if (!response.success) {
        console.error("[FRETE-HOOK] Resposta com erro:", response);
        
        setFreteErrorData({
          message: response.error || "Erro ao calcular frete",
          error_code: response.error_code
        });
        
        toast.error("Erro ao calcular frete", {
          description: response.error
        });
        
        return response;
      }

      // Sucesso - invalidar cache
      await queryClient.invalidateQueries({ queryKey: ["venda", vendaId] });
      await queryClient.invalidateQueries({ queryKey: ["integracao-frete-log", vendaId] });

      toast.success("Frete calculado com sucesso!", {
        description: response.mensagem
      });

      console.log(`[FRETE-HOOK] Frete calculado: R$ ${response.valor_frete}`);

      return response;

    } catch (err: any) {
      console.error("[FRETE-HOOK] Exceção:", err);
      
      const errorMessage = err.message || "Erro inesperado ao calcular frete";
      
      setFreteErrorData({
        message: errorMessage,
        error_code: "EXCEPTION"
      });
      
      toast.error("Erro ao calcular frete", {
        description: errorMessage
      });
      
      return {
        success: false,
        error: errorMessage,
        error_code: "EXCEPTION"
      };
    } finally {
      setIsCalculatingFrete(false);
    }
  };

  const closeFreteErrorDialog = () => {
    setShowFreteErrorDialog(false);
    setFreteErrorData(null);
  };

  return {
    calcularFrete,
    isCalculatingFrete,
    freteErrorData,
    showFreteErrorDialog,
    setShowFreteErrorDialog,
    closeFreteErrorDialog
  };
}
