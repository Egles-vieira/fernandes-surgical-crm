import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useFocusZone() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: atividadeFoco, isLoading, refetch } = useQuery({
    queryKey: ['focus-zone', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('atividades')
        .select(`*, clientes (nome_abrev, nome_emit, telefone1), codigos_disposicao (codigo, nome, cor), vendas (numero_venda, etapa_pipeline)`)
        .eq('responsavel_id', user.id)
        .is('excluido_em', null)
        .in('status', ['pendente', 'em_andamento'])
        .order('score_prioridade', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000
  });

  const { data: filaAtividades } = useQuery({
    queryKey: ['focus-zone-fila', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('atividades')
        .select(`id, numero_atividade, titulo, tipo, prioridade, data_vencimento, score_prioridade, clientes (nome_abrev)`)
        .eq('responsavel_id', user.id)
        .is('excluido_em', null)
        .in('status', ['pendente', 'em_andamento'])
        .order('score_prioridade', { ascending: false })
        .range(1, 5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const pularAtividade = useMutation({
    mutationFn: async (params: { id: string }) => {
      const { error } = await supabase.from('atividades').update({ score_prioridade: -1000 }).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-zone'] });
      toast.info('Atividade adiada');
    }
  });

  const iniciarAtividade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('atividades').update({ status: 'em_andamento', data_inicio: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-zone'] });
      toast.success('Atividade iniciada');
    }
  });

  const { data: estatisticasDia } = useQuery({
    queryKey: ['focus-zone-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const { count: concluidasHoje } = await supabase.from('atividades').select('id', { count: 'exact', head: true }).eq('responsavel_id', user.id).eq('status', 'concluida').gte('data_conclusao', hoje.toISOString());
      const { count: pendentes } = await supabase.from('atividades').select('id', { count: 'exact', head: true }).eq('responsavel_id', user.id).in('status', ['pendente', 'em_andamento']).is('excluido_em', null);
      const { count: atrasadas } = await supabase.from('atividades').select('id', { count: 'exact', head: true }).eq('responsavel_id', user.id).in('status', ['pendente', 'em_andamento']).lt('data_vencimento', new Date().toISOString()).is('excluido_em', null);
      return { concluidasHoje: concluidasHoje || 0, pendentes: pendentes || 0, atrasadas: atrasadas || 0 };
    },
    enabled: !!user?.id
  });

  return { atividadeFoco, filaAtividades: filaAtividades || [], estatisticasDia, isLoading, refetch, pularAtividade, iniciarAtividade };
}
