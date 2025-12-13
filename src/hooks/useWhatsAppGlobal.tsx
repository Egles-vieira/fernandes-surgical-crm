import { useWhatsAppContext } from '@/contexts/WhatsAppContext';

/**
 * Hook principal para acesso ao contexto global do WhatsApp.
 * Fornece acesso a todas as funcionalidades do módulo WhatsApp.
 */
export const useWhatsAppGlobal = () => {
  const context = useWhatsAppContext();
  
  return {
    // Configuração
    configuracao: context.configuracao,
    isLoadingConfig: context.isLoadingConfig,
    isMetaAPI: context.configuracao?.provedor_ativo === 'meta',
    isOficial: context.configuracao?.modo_api === 'oficial',
    
    // Status do usuário
    statusAtual: context.statusAtual,
    isChangingStatus: context.isChangingStatus,
    isOnline: context.statusAtual === 'online',
    isOcupado: context.statusAtual === 'ocupado',
    isPausa: context.statusAtual === 'pausa',
    isOffline: context.statusAtual === 'offline',
    changeStatus: context.changeStatus,
    
    // Conversas
    minhasConversas: context.minhasConversas,
    conversaSelecionadaId: context.conversaSelecionadaId,
    selecionarConversa: context.selecionarConversa,
    totalNaoLidas: context.totalNaoLidas,
    
    // Ações em conversas
    assumirConversa: context.assumirConversa,
    transferirConversa: context.transferirConversa,
    encerrarConversa: context.encerrarConversa,
    
    // User info
    userId: context.userId,
    isAdmin: context.isAdmin,
    isSupervisor: context.isSupervisor,
    
    // Unidades
    unidades: context.unidades,
    
    // Refresh
    refreshData: context.refreshData,
  };
};

export default useWhatsAppGlobal;
