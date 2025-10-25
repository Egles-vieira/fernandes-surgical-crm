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

    console.log('🔌 Conectando ao canal realtime:', `cotacao-ia-${cotacaoId}`);

    const channel = supabase
      .channel(`cotacao-ia-${cotacaoId}`)
      .on(
        'broadcast',
        { event: 'analise-iniciada' },
        (payload) => {
          console.log('🚀 Análise iniciada:', payload);
          setIsAnalyzing(true);
          setProgress({
            cotacao_id: cotacaoId,
            status: 'iniciando',
            total_itens: payload.payload?.total_itens || 0,
            itens_analisados: 0,
            itens_pendentes: payload.payload?.total_itens || 0,
            percentual: 0,
            itens_detalhes: [],
          });
          toast.info('Análise de IA iniciada', {
            description: `${payload.payload?.total_itens || 0} itens serão analisados`,
          });
        }
      )
      .on(
        'broadcast',
        { event: 'analise-progresso' },
        (payload) => {
          console.log('📡 Progresso recebido:', payload);
          const progressData = payload.payload as ProgressoAnaliseIA;
          setProgress(progressData);
          
          // Notificação a cada 25% de progresso
          const percentual = progressData.percentual || 0;
          if (percentual > 0 && percentual % 25 === 0) {
            toast.info(`Análise ${percentual}% completa`, {
              description: `${progressData.itens_analisados}/${progressData.total_itens} itens analisados`,
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'analise-item-concluido' },
        (payload) => {
          console.log('✅ Item analisado:', payload);
          const { item_descricao, sugestoes_encontradas } = payload.payload || {};
          
          if (sugestoes_encontradas > 0) {
            toast.success(`Item analisado: ${item_descricao}`, {
              description: `${sugestoes_encontradas} sugestão(ões) encontrada(s)`,
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'analise-concluida' },
        (payload) => {
          console.log('✅ Análise concluída:', payload);
          const progressData = payload.payload as ProgressoAnaliseIA;
          setProgress(progressData);
          setIsAnalyzing(false);
          
          const itensComSugestao = progressData.itens_detalhes?.filter(
            item => item.sugestoes && item.sugestoes.length > 0
          ).length || 0;
          const totalItens = progressData.total_itens || 0;
          
          toast.success('Análise de IA concluída!', {
            description: `${itensComSugestao}/${totalItens} itens com sugestões`,
            duration: 5000,
          });
        }
      )
      .on(
        'broadcast',
        { event: 'analise-erro' },
        (payload) => {
          console.error('❌ Erro na análise:', payload);
          setError(payload.payload?.erro || 'Erro desconhecido');
          setIsAnalyzing(false);
          toast.error('Erro na análise de IA', {
            description: payload.payload?.erro || 'Erro desconhecido',
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal:', status);
        if (status === 'SUBSCRIBED') {
          toast.success('Conectado ao sistema de notificações');
        }
      });

    return () => {
      console.log('🔌 Desconectando do canal realtime');
      supabase.removeChannel(channel);
    };
  }, [cotacaoId]);

  const iniciarAnalise = useCallback(async (cotacaoIdParam: string) => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(null);

    try {
      console.log('🚀 Iniciando análise de IA para cotação:', cotacaoIdParam);
      
      toast.loading('Iniciando análise de IA...', {
        id: 'iniciar-analise',
      });
      
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
      toast.success('Análise de IA em andamento', {
        id: 'iniciar-analise',
        description: 'Acompanhe o progresso em tempo real',
      });
      
      return data;
    } catch (err: any) {
      console.error('❌ Erro ao iniciar análise:', err);
      setError(err.message || 'Erro ao iniciar análise');
      setIsAnalyzing(false);
      toast.error('Erro ao iniciar análise de IA', {
        id: 'iniciar-analise',
        description: err.message || 'Tente novamente',
      });
      throw err;
    }
  }, []);

  const cancelarAnalise = useCallback(() => {
    setIsAnalyzing(false);
    setProgress(null);
    toast.warning('Análise cancelada', {
      description: 'A análise foi interrompida pelo usuário',
    });
  }, []);

  return {
    isAnalyzing,
    progress,
    error,
    iniciarAnalise,
    cancelarAnalise,
  };
}
