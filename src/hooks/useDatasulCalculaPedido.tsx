import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { parseError, ParsedError } from "@/lib/datasul-errors";

interface DatasulResponse {
  success: boolean;
  venda_id?: string;
  numero_venda?: string;
  resumo?: {
    total_itens: number;
    total_lotes?: number;
    lotes_processados?: number;
    lotes_em_background?: number;
    tempo_resposta_ms: number;
  };
  processamento_completo?: boolean;
  mensagem?: string;
  lotes?: Array<{
    lote: number;
    tempo_ms: number;
  }>;
  datasul_response?: any;
  error?: string;
  error_code?: string;
  error_category?: string;
  error_details?: any;
  details?: string;
}

interface ProgressoCalculo {
  loteAtual: number;
  totalLotes: number;
  percentual: number;
}

export function useDatasulCalculaPedido() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoCalculo | null>(null);
  const [errorData, setErrorData] = useState<ParsedError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const queryClient = useQueryClient();

  const calcularPedido = async (vendaId: string) => {
    if (!vendaId) {
      toast.error("É necessário salvar a venda antes de calcular.");
      return null;
    }

    setIsCalculating(true);
    setProgresso(null);

    // Toast de início com ID para poder atualizar
    const toastId = toast.loading("Iniciando cálculo do pedido...", {
      description: "Preparando dados para envio ao Datasul",
    });

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
        // Criar objeto de erro com todos os dados estruturados
        console.log("🔴 Datasul retornou erro:", data);
        const errorObj: any = new Error(data.error || "Erro ao calcular pedido no Datasul");
        errorObj.error_code = data.error_code;
        errorObj.error_category = data.error_category;
        errorObj.error_details = data.error_details;
        console.log("🔴 Objeto de erro criado:", errorObj);
        throw errorObj;
      }

      console.log("Resposta Datasul:", data);

      // Busca os itens atualizados da venda
      const { data: itensAtualizados, error: itensError } = await supabase
        .from("vendas_itens")
        .select("*, produtos(*)")
        .eq("venda_id", vendaId);

      if (itensError) {
        console.error("Erro ao buscar itens atualizados:", itensError);
      }

      // Fechar toast de loading e mostrar sucesso
      toast.dismiss(toastId);
      
      const tempoSegundos = ((data.resumo?.tempo_resposta_ms || 0) / 1000).toFixed(1);
      const totalLotes = data.resumo?.total_lotes || 1;
      const lotesBackground = data.resumo?.lotes_em_background || 0;
      
      if (lotesBackground > 0) {
        toast.success("Cálculo iniciado com sucesso", {
          description: `Primeiro lote calculado em ${tempoSegundos}s. ${lotesBackground} lote(s) sendo processados em background.`,
          duration: 5000,
        });
      } else {
        toast.success("Cálculo realizado com sucesso", {
          description: `Pedido ${data.numero_venda} calculado em ${tempoSegundos}s`,
        });
      }

      // Invalida a query para atualizar o log automaticamente
      queryClient.invalidateQueries({ queryKey: ["integracao-datasul-log"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });

      return { ...data, itensAtualizados };
    } catch (error) {
      console.error("Erro ao calcular pedido:", error);
      console.log("🔴 Erro capturado no catch:", {
        error,
        hasErrorCode: 'error_code' in (error as any),
        errorCode: (error as any).error_code,
        errorCategory: (error as any).error_category,
      });
      
      // Fechar toast de loading
      toast.dismiss(toastId);
      
      // Processar e categorizar o erro
      const parsedError = parseError(error);
      console.log("🔴 Erro processado:", parsedError);
      setErrorData(parsedError);
      setShowErrorDialog(true);
      console.log("🔴 Modal deveria estar aberto agora. showErrorDialog=true");
      
      // Também mostrar toast para erros simples
      toast.error("Erro ao calcular pedido", {
        description: parsedError.mensagem.substring(0, 100),
      });

      return null;
    } finally {
      setIsCalculating(false);
      setProgresso(null);
    }
  };

  return {
    calcularPedido,
    isCalculating,
    progresso,
    errorData,
    showErrorDialog,
    closeErrorDialog: () => setShowErrorDialog(false),
  };
}
