import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProgressoAnaliseIA } from '@/types/ia-analysis';

export function useIAAnalysis(cotacaoId?: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressoAnaliseIA | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!cotacaoId) return;

    const channel = supabase
      .channel(`cotacao-ia-${cotacaoId}`)
      .on(
        'broadcast',
        { event: 'analise-progresso' },
        (payload) => {
          console.log('📡 Progresso recebido:', payload);
          setProgress(payload.payload as ProgressoAnaliseIA);
        }
      )
      .on(
        'broadcast',
        { event: 'analise-concluida' },
        (payload) => {
          console.log('✅ Análise concluída:', payload);
          setProgress(payload.payload as ProgressoAnaliseIA);
          setIsAnalyzing(false);
          toast.success('Análise de IA concluída com sucesso!');
        }
      )
      .on(
        'broadcast',
        { event: 'analise-erro' },
        (payload) => {
          console.error('❌ Erro na análise:', payload);
          setError(payload.payload?.erro || 'Erro desconhecido');
          setIsAnalyzing(false);
          toast.error('Erro na análise de IA');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cotacaoId]);

  const iniciarAnalise = useCallback(async (cotacaoIdParam: string) => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(null);

    try {
      console.log('🚀 Iniciando análise de IA para cotação:', cotacaoIdParam);
      
      const { data, error: funcError } = await supabase.functions.invoke(
        'analisar-cotacao-completa',
        {
          body: { cotacao_id: cotacaoIdParam }
        }
      );

      if (funcError) {
        throw funcError;
      }

      console.log('✅ Análise iniciada:', data);
      toast.success('Análise de IA iniciada');
      
      return data;
    } catch (err: any) {
      console.error('❌ Erro ao iniciar análise:', err);
      setError(err.message || 'Erro ao iniciar análise');
      setIsAnalyzing(false);
      toast.error('Erro ao iniciar análise de IA');
      throw err;
    }
  }, []);

  const cancelarAnalise = useCallback(() => {
    setIsAnalyzing(false);
    setProgress(null);
    toast.info('Análise cancelada');
  }, []);

  return {
    isAnalyzing,
    progress,
    error,
    iniciarAnalise,
    cancelarAnalise,
  };
}
