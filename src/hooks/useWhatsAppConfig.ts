import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppConfigGlobal {
  id: string;
  modo_api: 'oficial' | 'nao_oficial';
  provedor_ativo: 'gupshup' | 'w_api' | 'meta_cloud_api';
  esta_ativo: boolean;
  configurado_em: string;
  observacoes: string | null;
}

export function useWhatsAppConfig() {
  const queryClient = useQueryClient();

  // Buscar configuração ativa
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['whatsapp-config-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_configuracao_global')
        .select('*')
        .eq('esta_ativo', true)
        .single();

      if (error) throw error;
      return data as WhatsAppConfigGlobal;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para atualizar configuração
  const atualizarConfig = useMutation({
    mutationFn: async (novaConfig: {
      modo_api: 'oficial' | 'nao_oficial';
      provedor_ativo: 'gupshup' | 'w_api' | 'meta_cloud_api';
      observacoes?: string;
    }) => {
      // Desativar config atual
      if (config?.id) {
        await supabase
          .from('whatsapp_configuracao_global')
          .update({ esta_ativo: false })
          .eq('id', config.id);
      }

      // Inserir nova config
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('whatsapp_configuracao_global')
        .insert({
          modo_api: novaConfig.modo_api,
          provedor_ativo: novaConfig.provedor_ativo,
          esta_ativo: true,
          observacoes: novaConfig.observacoes,
          configurado_por: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config-global'] });
      toast.success('Configuração atualizada! Recarregando...', { duration: 3000 });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  return {
    config,
    isLoading,
    error,
    
    // Flags
    isOficial: config?.modo_api === 'oficial',
    isNaoOficial: config?.modo_api === 'nao_oficial',
    isGupshup: config?.provedor_ativo === 'gupshup',
    isWAPI: config?.provedor_ativo === 'w_api',
    isMetaCloudAPI: config?.provedor_ativo === 'meta_cloud_api',
    
    // Mutation
    atualizarConfig: atualizarConfig.mutate,
    isAtualizando: atualizarConfig.isPending,
  };
}
