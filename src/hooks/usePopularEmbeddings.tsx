import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProgressoEmbedding {
  concluido: boolean;
  processados: number;
  erros: number;
  restantes: number;
  total_produtos: number;
  progresso_percent: number;
  tokens_totais: number;
  tempo_ms: number;
  mensagem: string;
  detalhes_erros?: Array<{ produto_id: string; erro: string }>;
}

export function usePopularEmbeddings() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoEmbedding | null>(null);
  const [totalProcessado, setTotalProcessado] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [tempoTotal, setTempoTotal] = useState(0);

  const processarLote = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("popular-embeddings");

      if (error) throw error;

      const resultado = data as ProgressoEmbedding;
      setProgresso(resultado);
      setTotalProcessado(prev => prev + resultado.processados);
      setTotalTokens(prev => prev + resultado.tokens_totais);
      setTempoTotal(prev => prev + resultado.tempo_ms);

      if (resultado.erros > 0) {
        toast.error(`${resultado.erros} produtos com erro neste lote`);
      }

      return resultado.concluido;
    } catch (error: any) {
      console.error("Erro ao processar lote:", error);
      toast.error(`Erro ao processar lote: ${error.message}`);
      throw error;
    }
  };

  const iniciarPopulacao = async () => {
    setIsProcessing(true);
    setTotalProcessado(0);
    setTotalTokens(0);
    setTempoTotal(0);
    
    toast.info("Iniciando população de embeddings...");

    try {
      let concluido = false;
      let tentativas = 0;
      const MAX_TENTATIVAS = 100; // Limite de segurança

      while (!concluido && tentativas < MAX_TENTATIVAS) {
        tentativas++;
        console.log(`Processando lote ${tentativas}...`);
        
        concluido = await processarLote();

        if (!concluido) {
          // Pequeno delay entre lotes para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (concluido) {
        toast.success("População de embeddings concluída com sucesso!");
      } else {
        toast.warning("Processo interrompido após limite de tentativas");
      }
    } catch (error) {
      toast.error("Erro durante a população de embeddings");
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
    progresso,
    totalProcessado,
    totalTokens,
    tempoTotal,
    iniciarPopulacao,
    cancelar,
  };
}
