import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Notificacao {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  entidade_id: string | null;
  entidade_tipo: string | null;
  lida: boolean;
  criada_em: string;
  lida_em: string | null;
  metadata: any;
}

export function useNotificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar notificações (últimas 50)
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('criada_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notificacao[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch a cada 30 segundos (leve)
  });

  // Contar não lidas
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  // Marcar como lida
  const marcarComoLida = useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ 
          lida: true, 
          lida_em: new Date().toISOString() 
        })
        .eq('id', notificacaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
    onError: (error: any) => {
      console.error('Erro ao marcar notificação como lida:', error);
    },
  });

  // Marcar todas como lidas
  const marcarTodasComoLidas = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notificacoes')
        .update({ 
          lida: true, 
          lida_em: new Date().toISOString() 
        })
        .eq('usuario_id', user.id)
        .eq('lida', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
    onError: (error: any) => {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar notificações como lidas');
    },
  });

  return {
    notificacoes,
    isLoading,
    naoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
  };
}
