import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseError, ParsedError } from "@/lib/datasul-errors";

interface DatasulOportunidadeResponse {
  success: boolean;
  oportunidade_id?: string;
  codigo_oportunidade?: string;
  resumo?: {
    total_itens: number;
    tempo_resposta_ms: number;
    tempo_preparacao_dados_ms?: number;
    tempo_api_ms?: number;
    tempo_tratamento_dados_ms?: number;
  };
  processamento_completo?: boolean;
  datasul_response?: any;
  error?: string;
  error_code?: string;
  error_category?: string;
  error_details?: any;
}

export function useDatasulCalculaOportunidade() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorData, setErrorData] = useState<ParsedError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const queryClient = useQueryClient();

  const calcularOportunidade = async (oportunidadeId: string) => {
    if (!oportunidadeId) {
      toast.error("Oportunidade não identificada");
      return null;
    }

    setIsCalculating(true);

    const toastId = toast.loading("Calculando oportunidade...", {
      description: "Preparando dados para envio ao Datasul",
    });

    try {
      console.log("[DATASUL] Chamando edge function para calcular oportunidade:", oportunidadeId);

      const { data, error } = await supabase.functions.invoke<DatasulOportunidadeResponse>(
        "calcular-oportunidade-datasul",
        {
          body: { oportunidade_id: oportunidadeId },
        }
      );

      if (error) {
        console.error("[DATASUL] Erro ao chamar edge function:", error);
        throw new Error(error.message || "Erro ao calcular oportunidade");
      }

      if (!data) {
        throw new Error("Nenhum dado retornado do Datasul");
      }

      if (!data.success) {
        const errorObj: any = new Error(data.error || "Erro ao calcular oportunidade no Datasul");
        errorObj.error_code = data.error_code;
        errorObj.error_category = data.error_category;
        errorObj.error_details = data.error_details;
        throw errorObj;
      }

      console.log("[DATASUL] Resposta Datasul:", data);

      toast.dismiss(toastId);
      
      const tempoSegundos = ((data.resumo?.tempo_resposta_ms ?? 0) / 1000).toFixed(1);
      
      toast.success("Cálculo realizado com sucesso", {
        description: `Oportunidade ${data.codigo_oportunidade || ''} calculada em ${tempoSegundos}s`,
      });

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ["itens-oportunidade", oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["integracao-datasul-log"] });

      return data;
    } catch (error) {
      console.error("[DATASUL] Erro ao calcular oportunidade:", error);
      
      toast.dismiss(toastId);
      
      const parsedError = parseError(error);
      setErrorData(parsedError);
      setShowErrorDialog(true);
      
      toast.error("Erro ao calcular oportunidade", {
        description: parsedError.mensagem.substring(0, 100),
      });

      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  return {
    calcularOportunidade,
    isCalculating,
    errorData,
    showErrorDialog,
    closeErrorDialog: () => setShowErrorDialog(false),
  };
}
