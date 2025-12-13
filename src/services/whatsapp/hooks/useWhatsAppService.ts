// ============================================
// useWhatsAppService Hook
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { whatsAppService, handleMetaError } from '../index';

/**
 * Hook principal para interagir com o WhatsApp Service
 * Centraliza todas as operações e tratamento de erros
 */
export function useWhatsAppService() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Status da conexão com a Meta API
   */
  const { 
    data: connectionStatus, 
    isLoading: isCheckingConnection,
    refetch: refreshConnectionStatus,
  } = useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: () => whatsAppService.getConnectionStatus(),
    staleTime: 30_000, // 30 segundos
    refetchInterval: 60_000, // 1 minuto
  });

  /**
   * Conta ativa
   */
  const {
    data: activeAccount,
    isLoading: isLoadingAccount,
  } = useQuery({
    queryKey: ['whatsapp-active-account'],
    queryFn: () => whatsAppService.loadActiveAccount(),
    staleTime: 60_000,
  });

  /**
   * Configuração global
   */
  const {
    data: globalConfig,
    isLoading: isLoadingConfig,
  } = useQuery({
    queryKey: ['whatsapp-global-config'],
    queryFn: () => whatsAppService.loadGlobalConfig(),
    staleTime: 60_000,
  });

  /**
   * Templates disponíveis
   */
  const {
    data: templates,
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => whatsAppService.listTemplates(),
    staleTime: 5 * 60_000, // 5 minutos
    enabled: !!activeAccount,
  });

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Enviar mensagem
   */
  const sendMessageMutation = useMutation({
    mutationFn: async (mensagemId: string) => {
      return whatsAppService.sendMessage(mensagemId);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      }
    },
    onError: (error: any) => {
      const friendly = handleMetaError(error);
      toast({
        variant: 'destructive',
        title: friendly.title,
        description: friendly.message,
      });

      if (friendly.action === 'settings') {
        toast({
          title: 'Ação Necessária',
          description: 'Verifique as configurações do WhatsApp',
        });
        // Navegar para configurações após pequeno delay
        setTimeout(() => navigate('/whatsapp/configuracoes'), 2000);
      }
    },
  });

  /**
   * Enviar template
   */
  const sendTemplateMutation = useMutation({
    mutationFn: async (params: { 
      to: string; 
      templateName: string; 
      components?: any[];
    }) => {
      if (!activeAccount) throw new Error('Nenhuma conta ativa');
      return whatsAppService.sendTemplate({
        ...params,
        contaId: activeAccount.id,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Template enviado',
          description: 'Mensagem de template enviada com sucesso',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao enviar template',
          description: result.error,
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar template',
        description: error.message,
      });
    },
  });

  /**
   * Testar conexão
   */
  const testConnectionMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return whatsAppService.testConnection(phoneNumber);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: '✅ Conexão OK',
          description: 'Mensagem de teste enviada com sucesso!',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no teste',
          description: result.error,
        });
      }
    },
    onError: (error: any) => {
      const friendly = handleMetaError(error);
      toast({
        variant: 'destructive',
        title: friendly.title,
        description: friendly.message,
      });
    },
  });

  // ============================================
  // RETURN
  // ============================================

  return {
    // Estado da conexão
    connectionStatus,
    isCheckingConnection,
    isConnected: connectionStatus?.connected ?? false,
    phoneNumberId: connectionStatus?.phoneNumberId,
    qualityRating: connectionStatus?.qualityRating ?? 'UNKNOWN',
    tokenExpired: connectionStatus?.tokenExpired ?? false,

    // Conta ativa
    activeAccount,
    isLoadingAccount,

    // Configuração global
    globalConfig,
    isLoadingConfig,
    isMetaCloudAPI: globalConfig?.provedor_ativo === 'meta_cloud_api',

    // Templates
    templates,
    isLoadingTemplates,

    // Ações - Enviar mensagem
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,

    // Ações - Enviar template
    sendTemplate: sendTemplateMutation.mutateAsync,
    isSendingTemplate: sendTemplateMutation.isPending,

    // Ações - Testar conexão
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending,

    // Refresh
    refreshConnectionStatus,
  };
}

export default useWhatsAppService;
