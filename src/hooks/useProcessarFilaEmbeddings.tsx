import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResultadoProcessamento {
  sucesso: boolean;
  fila_vazia: boolean;
  processados: number;
  falhas: number;
  pendentes_restantes: number;
  total_completados: number;
  mensagem: string;
  detalhes?: Array<{
    fila_id: string;
    produto_id: string;
    status: "sucesso" | "falha";
    erro?: string;
  }>;
}

export function useProcessarFilaEmbeddings() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultado, setResultado] = useState<ResultadoProcessamento | null>(null);
  const [totalProcessado, setTotalProcessado] = useState(0);
  const [totalFalhas, setTotalFalhas] = useState(0);

  const processarLote = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("processar-fila-embeddings");

      if (error) throw error;

      const resultado = data as ResultadoProcessamento;
      setResultado(resultado);
      setTotalProcessado(prev => prev + resultado.processados);
      setTotalFalhas(prev => prev + resultado.falhas);

      if (resultado.falhas > 0) {
        toast.warning(`${resultado.falhas} produtos com erro neste lote`);
      }

      // Retorna true se a fila está vazia
      return resultado.fila_vazia || resultado.pendentes_restantes === 0;
    } catch (error: any) {
      console.error("Erro ao processar lote:", error);
      toast.error(`Erro ao processar lote: ${error.message}`);
      throw error;
    }
  };

  const iniciarProcessamento = async () => {
    setIsProcessing(true);
    setTotalProcessado(0);
    setTotalFalhas(0);
    
    toast.info("Iniciando processamento da fila de embeddings...");

    try {
      let filaVazia = false;
      let tentativas = 0;
      const MAX_TENTATIVAS = 100; // Limite de segurança

      while (!filaVazia && tentativas < MAX_TENTATIVAS) {
        tentativas++;
        console.log(`Processando lote ${tentativas}...`);
        
        filaVazia = await processarLote();

        if (!filaVazia) {
          // Delay entre lotes
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (filaVazia) {
        toast.success("Fila de embeddings processada com sucesso!");
      } else {
        toast.warning("Processo interrompido após limite de tentativas");
      }
    } catch (error) {
      toast.error("Erro durante o processamento da fila");
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelar = () => {
    setIsProcessing(false);
    toast.info("Processo cancelado pelo usuário");
  };

  return {
    isProcessing,
    resultado,
    totalProcessado,
    totalFalhas,
    iniciarProcessamento,
    cancelar,
  };
}
