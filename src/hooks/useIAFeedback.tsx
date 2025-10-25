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

      const { data, error } = await supabase
        .from('ia_feedback_historico')
        .insert({
          cotacao_item_id: feedback.cotacao_item_id,
          produto_sugerido_id: feedback.produto_sugerido_id,
          produto_correto_id: feedback.produto_correto_id,
          tipo_feedback: feedback.tipo_feedback,
          foi_aceito: feedback.foi_aceito,
          motivo_rejeicao: feedback.motivo_rejeicao,
          score_original: feedback.score_original,
          detalhes_contexto: feedback.detalhes_contexto,
          usuario_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Feedback registrado com sucesso');
      return data;
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
