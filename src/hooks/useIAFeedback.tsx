import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedbackIA } from '@/types/ia-analysis';

export function useIAFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enviarFeedback = useCallback(async (feedback: Omit<FeedbackIA, 'id' | 'criado_em' | 'usuario_id'>) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('📤 Enviando feedback da IA:', feedback);

      // 1. Registrar feedback usando função SQL (inclui histórico + atualização do item)
      const { error: feedbackError } = await supabase.rpc('registrar_feedback_ia', {
        p_item_id: feedback.cotacao_item_id,
        p_produto_sugerido_id: feedback.produto_sugerido_id || null,
        p_produto_escolhido_id: feedback.produto_correto_id || null,
        p_feedback_tipo: feedback.foi_aceito ? 'aceito' : 'rejeitado',
        p_score_ia: feedback.score_original || 0
      });

      if (feedbackError) {
        console.error('❌ Erro ao registrar feedback:', feedbackError);
        throw feedbackError;
      }

      console.log('✅ Feedback registrado com sucesso');

      // 2. Ajustar score para machine learning (se houver produto sugerido)
      if (feedback.produto_sugerido_id && feedback.foi_aceito !== undefined) {
        const feedbackTipo = feedback.foi_aceito ? 'aceito' : 'rejeitado';
        
        const { error: scoreError } = await supabase.rpc('ajustar_score_aprendizado', {
          p_produto_id: feedback.produto_sugerido_id,
          p_feedback_tipo: feedbackTipo,
          p_score_original: feedback.score_original || 0
        });

        if (scoreError) {
          console.warn('⚠️ Erro ao ajustar score (não crítico):', scoreError);
        } else {
          console.log('🧠 Score ajustado para machine learning');
        }
      }

      toast.success('Feedback registrado! A IA vai aprender com sua escolha.');
      
      return { success: true };
    } catch (err: any) {
      console.error('❌ Erro ao enviar feedback:', err);
      toast.error('Erro ao registrar feedback');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const buscarFeedbackItem = useCallback(async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('ia_feedback_historico')
        .select('*')
        .eq('cotacao_item_id', itemId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('❌ Erro ao buscar feedback:', err);
      return [];
    }
  }, []);

  return {
    isSubmitting,
    enviarFeedback,
    buscarFeedbackItem,
  };
}
