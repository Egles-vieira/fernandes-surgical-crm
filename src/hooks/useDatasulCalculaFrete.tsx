import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransportadoraOption {
  cod_transp: number;
  nome_transp: string;
  cnpj_transp: string;
  vl_tot_frete: number;
  prazo_entrega: number;
  vl_tde: number;
  bloqueio: string;
  orig?: boolean;
}

interface FreteResponse {
  success: boolean;
  transportadoras?: TransportadoraOption[];
  quantidade_opcoes?: number;
  mensagem?: string;
  error?: string;
  error_code?: string;
  tempo_total_ms?: number;
}

interface ConfirmarFreteResponse {
  success: boolean;
  valor_frete?: number;
  transportadora_nome?: string;
  transportadora_cod?: number;
  prazo_entrega_dias?: number;
  frete_rateado?: boolean;
  mensagem?: string;
  error?: string;
  error_code?: string;
}

interface FreteErrorData {
  message: string;
  error_code?: string;
  details?: string;
}

export function useDatasulCalculaFrete() {
  const [isCalculatingFrete, setIsCalculatingFrete] = useState(false);
  const [isConfirmingFrete, setIsConfirmingFrete] = useState(false);
  const [freteErrorData, setFreteErrorData] = useState<FreteErrorData | null>(null);
  const [showFreteErrorDialog, setShowFreteErrorDialog] = useState(false);
  const [transportadoras, setTransportadoras] = useState<TransportadoraOption[]>([]);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const queryClient = useQueryClient();

  // Calcular frete - retorna lista de transportadoras e abre modal
  const calcularFrete = async (vendaId: string): Promise<FreteResponse | null> => {
    if (!vendaId) {
      toast.error("ID da venda não informado");
      return null;
    }

    setIsCalculatingFrete(true);
    setFreteErrorData(null);
    setTransportadoras([]);

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

      // Sucesso - setar transportadoras e abrir modal
      if (response.transportadoras && response.transportadoras.length > 0) {
        setTransportadoras(response.transportadoras);
        setShowSelectionDialog(true);
        
        toast.success("Frete calculado!", {
          description: response.mensagem
        });
      }

      console.log(`[FRETE-HOOK] ${response.quantidade_opcoes} opções de frete encontradas`);

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

  // Confirmar seleção de transportadora
  const confirmarFrete = async (
    vendaId: string, 
    transportadora: TransportadoraOption
  ): Promise<ConfirmarFreteResponse | null> => {
    if (!vendaId) {
      toast.error("ID da venda não informado");
      return null;
    }

    if (!transportadora) {
      toast.error("Transportadora não selecionada");
      return null;
    }

    setIsConfirmingFrete(true);

    try {
      console.log(`[FRETE-HOOK] Confirmando transportadora: ${transportadora.nome_transp}`);

      const { data, error } = await supabase.functions.invoke("confirmar-frete-datasul", {
        body: { 
          venda_id: vendaId,
          transportadora
        }
      });

      if (error) {
        console.error("[FRETE-HOOK] Erro ao confirmar:", error);
        toast.error("Erro ao confirmar frete", {
          description: error.message
        });
        return {
          success: false,
          error: error.message
        };
      }

      const response = data as ConfirmarFreteResponse;

      if (!response.success) {
        toast.error("Erro ao confirmar frete", {
          description: response.error
        });
        return response;
      }

      // Sucesso - fechar modal e invalidar cache
      setShowSelectionDialog(false);
      setTransportadoras([]);
      
      await queryClient.invalidateQueries({ queryKey: ["venda", vendaId] });
      await queryClient.invalidateQueries({ queryKey: ["integracao-frete-log", vendaId] });

      toast.success("Frete confirmado!", {
        description: `${response.transportadora_nome} - R$ ${response.valor_frete?.toFixed(2)}`
      });

      console.log(`[FRETE-HOOK] Frete confirmado com sucesso`);

      return response;

    } catch (err: any) {
      console.error("[FRETE-HOOK] Exceção ao confirmar:", err);
      toast.error("Erro ao confirmar frete", {
        description: err.message
      });
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsConfirmingFrete(false);
    }
  };

  const closeFreteErrorDialog = () => {
    setShowFreteErrorDialog(false);
    setFreteErrorData(null);
  };

  const closeSelectionDialog = () => {
    setShowSelectionDialog(false);
  };

  return {
    calcularFrete,
    confirmarFrete,
    isCalculatingFrete,
    isConfirmingFrete,
    freteErrorData,
    showFreteErrorDialog,
    setShowFreteErrorDialog,
    closeFreteErrorDialog,
    transportadoras,
    showSelectionDialog,
    setShowSelectionDialog,
    closeSelectionDialog
  };
}
