import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhatsAppContext, ModoDistribuicao } from '@/contexts/WhatsAppContext';

export interface ConfiguracaoDistribuicao {
  id: string;
  unidade_id: string | null;
  modo_distribuicao: ModoDistribuicao;
  max_conversas_por_atendente: number;
  tempo_timeout_segundos: number;
  redistribuir_automaticamente: boolean;
  priorizar_por_sla: boolean;
  esta_ativo: boolean;
}

export interface RegraRotamento {
  id: string;
  nome: string;
  condicao_tipo: 'horario' | 'origem' | 'palavra_chave' | 'setor';
  condicao_valor: string;
  destino_tipo: 'atendente' | 'fila' | 'unidade';
  destino_id: string;
  prioridade: number;
  esta_ativa: boolean;
}

/**
 * Hook para gerenciamento de distribuição de conversas.
 * Permite configurar modos de distribuição, regras de roteamento e atribuição manual.
 */
export const useWhatsAppDistribuicao = () => {
  const queryClient = useQueryClient();
  const context = useWhatsAppContext();

  // Query para configurações de distribuição
  const { data: configuracoes, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['whatsapp-distribuicao-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_config_atendimento')
        .select('*')
        .eq('esta_ativo', true);
      
      if (error) throw error;
      return (data || []) as ConfiguracaoDistribuicao[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  // Query para regras de roteamento
  const { data: regrasRoteamento, isLoading: isLoadingRegras } = useQuery({
    queryKey: ['whatsapp-regras-roteamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_regras_roteamento')
        .select('*')
        .eq('esta_ativa', true)
        .order('prioridade', { ascending: false });
      
      if (error) throw error;
      return (data || []) as RegraRotamento[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  // Mutation para atualizar configuração de distribuição
  const atualizarConfiguracao = useMutation({
    mutationFn: async (config: Partial<ConfiguracaoDistribuicao> & { id: string }) => {
      const { id, ...updates } = config;
      const { error } = await supabase
        .from('whatsapp_config_atendimento')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-distribuicao-config'] });
      toast.success('Configuração atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Mutation para criar regra de roteamento
  const criarRegraRoteamento = useMutation({
    mutationFn: async (regra: Omit<RegraRotamento, 'id'>) => {
      const { data, error } = await supabase
        .from('whatsapp_regras_roteamento')
        .insert(regra)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-regras-roteamento'] });
      toast.success('Regra criada');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });

  // Mutation para atribuir conversa manualmente
  const atribuirConversaManual = useMutation({
    mutationFn: async ({ conversaId, atendenteId }: { conversaId: string; atendenteId: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversas')
        .update({
          atendente_id: atendenteId,
          status: 'em_atendimento',
          atendimento_iniciado_em: new Date().toISOString(),
        })
        .eq('id', conversaId);
      
      if (error) throw error;
      
      // Marcar como atribuído na fila
      await supabase
        .from('whatsapp_fila_espera')
        .update({ atribuido_em: new Date().toISOString() })
        .eq('conversa_id', conversaId);
    },
    onSuccess: () => {
      context.refreshData();
      toast.success('Conversa atribuída');
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir: ' + error.message);
    },
  });

  // Mutation para redistribuir todas as conversas de um atendente
  const redistribuirConversas = useMutation({
    mutationFn: async (atendenteId: string) => {
      // Buscar conversas ativas do atendente
      const { data: conversas, error: fetchError } = await supabase
        .from('whatsapp_conversas')
        .select('id')
        .eq('atendente_id', atendenteId)
        .in('status', ['em_atendimento', 'aguardando_cliente']);
      
      if (fetchError) throw fetchError;
      
      // Colocar de volta na fila
      for (const conversa of conversas || []) {
        await supabase
          .from('whatsapp_conversas')
          .update({
            atendente_id: null,
            status: 'aberto',
          })
          .eq('id', conversa.id);
        
        await supabase
          .from('whatsapp_fila_espera')
          .insert({
            conversa_id: conversa.id,
            prioridade: 5, // Alta prioridade para redistribuição
          });
      }
      
      return conversas?.length || 0;
    },
    onSuccess: (count) => {
      context.refreshData();
      toast.success(`${count} conversa(s) redistribuída(s)`);
    },
    onError: (error: any) => {
      toast.error('Erro ao redistribuir: ' + error.message);
    },
  });

  return {
    // Dados
    configuracoes: configuracoes || [],
    regrasRoteamento: regrasRoteamento || [],
    filaEspera: context.filaEspera,
    operadores: context.operadores,
    
    // Loading
    isLoading: isLoadingConfigs || isLoadingRegras,
    
    // Actions
    atualizarConfiguracao: atualizarConfiguracao.mutate,
    criarRegraRoteamento: criarRegraRoteamento.mutate,
    atribuirConversaManual: atribuirConversaManual.mutate,
    redistribuirConversas: redistribuirConversas.mutate,
    distribuirProximaConversa: context.distribuirProximaConversa,
    
    // Pending states
    isAtualizando: atualizarConfiguracao.isPending,
    isAtribuindo: atribuirConversaManual.isPending,
    isRedistribuindo: redistribuirConversas.isPending,
    
    // Flags
    isSupervisor: context.isSupervisor,
  };
};

export default useWhatsAppDistribuicao;
