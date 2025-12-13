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
 */
export const useWhatsAppDistribuicao = () => {
  const queryClient = useQueryClient();
  const context = useWhatsAppContext();
  const client = supabase as any;

  const { data: configuracoes, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['whatsapp-distribuicao-config'],
    queryFn: async () => {
      const { data, error } = await client
        .from('whatsapp_config_atendimento')
        .select('*')
        .eq('esta_ativo', true);
      
      if (error) {
        console.warn('Tabela whatsapp_config_atendimento não disponível');
        return [];
      }
      return (data || []) as ConfiguracaoDistribuicao[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  const { data: regrasRoteamento, isLoading: isLoadingRegras } = useQuery({
    queryKey: ['whatsapp-regras-roteamento'],
    queryFn: async () => {
      const { data, error } = await client
        .from('whatsapp_regras_roteamento')
        .select('*')
        .eq('esta_ativa', true)
        .order('prioridade', { ascending: false });
      
      if (error) {
        console.warn('Tabela whatsapp_regras_roteamento não disponível');
        return [];
      }
      return (data || []) as RegraRotamento[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  const atualizarConfiguracao = useMutation({
    mutationFn: async (config: Partial<ConfiguracaoDistribuicao> & { id: string }) => {
      const { id, ...updates } = config;
      const { error } = await client
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

  const criarRegraRoteamento = useMutation({
    mutationFn: async (regra: Omit<RegraRotamento, 'id'>) => {
      const { data, error } = await client
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

  const atribuirConversaManual = useMutation({
    mutationFn: async ({ conversaId, atendenteId }: { conversaId: string; atendenteId: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversas')
        .update({
          atribuida_para_id: atendenteId,
          status: 'em_atendimento',
        } as any)
        .eq('id', conversaId);
      
      if (error) throw error;
      
      // Marcar como atendido na fila
      await client
        .from('whatsapp_fila_espera')
        .update({ atendido_em: new Date().toISOString() })
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

  const redistribuirConversas = useMutation({
    mutationFn: async (atendenteId: string) => {
      const { data: conversas, error: fetchError } = await client
        .from('whatsapp_conversas')
        .select('id')
        .eq('atribuida_para_id', atendenteId)
        .in('status', ['em_atendimento', 'aguardando_cliente']);
      
      if (fetchError) throw fetchError;
      
      for (const conversa of (conversas || []) as any[]) {
        await client
          .from('whatsapp_conversas')
          .update({ atribuida_para_id: null, status: 'aberto' })
          .eq('id', conversa.id);
        
        await client
          .from('whatsapp_fila_espera')
          .insert({ conversa_id: conversa.id, prioridade: 5 });
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
    configuracoes: configuracoes || [],
    regrasRoteamento: regrasRoteamento || [],
    filaEspera: context.filaEspera,
    operadores: context.operadores,
    isLoading: isLoadingConfigs || isLoadingRegras,
    atualizarConfiguracao: atualizarConfiguracao.mutate,
    criarRegraRoteamento: criarRegraRoteamento.mutate,
    atribuirConversaManual: atribuirConversaManual.mutate,
    redistribuirConversas: redistribuirConversas.mutate,
    distribuirProximaConversa: context.distribuirProximaConversa,
    isAtualizando: atualizarConfiguracao.isPending,
    isAtribuindo: atribuirConversaManual.isPending,
    isRedistribuindo: redistribuirConversas.isPending,
    isSupervisor: context.isSupervisor,
  };
};

export default useWhatsAppDistribuicao;
