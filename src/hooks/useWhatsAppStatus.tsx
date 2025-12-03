import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StatusAtendimento = 'online' | 'ocupado' | 'ausente' | 'offline';

export interface StatusConfig {
  value: StatusAtendimento;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const STATUS_CONFIGS: Record<StatusAtendimento, StatusConfig> = {
  online: {
    value: 'online',
    label: 'Online',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
  },
  ocupado: {
    value: 'ocupado',
    label: 'Ocupado',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
  },
  ausente: {
    value: 'ausente',
    label: 'Ausente',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
  },
  offline: {
    value: 'offline',
    label: 'Offline',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
    textColor: 'text-gray-600',
  },
};

export const useWhatsAppStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChanging, setIsChanging] = useState(false);

  // Buscar status atual do usuário
  const { data: statusAtual, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('perfis_usuario')
        .select('status_atendimento')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data.status_atendimento as StatusAtendimento;
    },
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async (novoStatus: StatusAtendimento) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('perfis_usuario')
        .update({ status_atendimento: novoStatus })
        .eq('id', user.id);

      if (error) throw error;
      return novoStatus;
    },
    onSuccess: (novoStatus) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      const config = STATUS_CONFIGS[novoStatus];
      toast({
        title: 'Status atualizado',
        description: `Seu status foi alterado para ${config.label}`,
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar seu status de atendimento',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsChanging(false);
    },
  });

  const changeStatus = async (novoStatus: StatusAtendimento) => {
    if (isChanging) return;
    setIsChanging(true);
    updateStatusMutation.mutate(novoStatus);
  };

  // Realtime: escutar mudanças no status (FILTRADO por usuário para escala)
  useEffect(() => {
    const setupRealtimeChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`status-atendimento-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'perfis_usuario',
            filter: `id=eq.${user.id}` // FILTRO CRÍTICO: escuta apenas mudanças do próprio usuário
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
          }
        )
        .subscribe();

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | undefined;
    setupRealtimeChannel().then(ch => { channel = ch; });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  const statusConfig = statusAtual ? STATUS_CONFIGS[statusAtual] : STATUS_CONFIGS.offline;

  return {
    statusAtual: statusAtual || 'offline',
    statusConfig,
    isLoading,
    isChanging,
    changeStatus,
  };
};
