import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhatsAppContext } from '@/contexts/WhatsAppContext';

export interface CarteiraCliente {
  id: string;
  cliente_id: string;
  atendente_id: string;
  motivo_atribuicao: string | null;
  criado_em: string;
  expira_em: string | null;
  cliente_nome?: string;
  atendente_nome?: string;
}

export interface EstatisticasCarteira {
  totalClientes: number;
  clientesAtivos: number;
  conversasRecentes: number;
  ultimoContato: string | null;
}

/**
 * Hook para gerenciamento de carteiras (sticky agent).
 * Permite atribuir clientes a atendentes específicos para continuidade de relacionamento.
 */
export const useWhatsAppCarteiras = () => {
  const queryClient = useQueryClient();
  const context = useWhatsAppContext();

  // Query para carteiras do atendente atual
  const { data: minhasCarteiras, isLoading: isLoadingMinhas } = useQuery({
    queryKey: ['whatsapp-carteiras-minhas', context.userId],
    queryFn: async () => {
      if (!context.userId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_carteiras')
        .select(`
          id,
          cliente_id,
          atendente_id,
          motivo_atribuicao,
          criado_em,
          expira_em,
          clientes!inner(nome_emit)
        `)
        .eq('atendente_id', context.userId)
        .or('expira_em.is.null,expira_em.gt.now()');
      
      if (error) throw error;
      
      return (data || []).map((c: any) => ({
        id: c.id,
        cliente_id: c.cliente_id,
        atendente_id: c.atendente_id,
        motivo_atribuicao: c.motivo_atribuicao,
        criado_em: c.criado_em,
        expira_em: c.expira_em,
        cliente_nome: c.clientes?.nome_emit || 'Cliente',
      })) as CarteiraCliente[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!context.userId,
  });

  // Query para todas as carteiras (supervisores)
  const { data: todasCarteiras, isLoading: isLoadingTodas } = useQuery({
    queryKey: ['whatsapp-carteiras-todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_carteiras')
        .select(`
          id,
          cliente_id,
          atendente_id,
          motivo_atribuicao,
          criado_em,
          expira_em,
          clientes!inner(nome_emit),
          perfis_usuario!inner(nome_completo)
        `)
        .or('expira_em.is.null,expira_em.gt.now()')
        .order('criado_em', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      
      return (data || []).map((c: any) => ({
        id: c.id,
        cliente_id: c.cliente_id,
        atendente_id: c.atendente_id,
        motivo_atribuicao: c.motivo_atribuicao,
        criado_em: c.criado_em,
        expira_em: c.expira_em,
        cliente_nome: c.clientes?.nome_emit || 'Cliente',
        atendente_nome: c.perfis_usuario?.nome_completo || 'Atendente',
      })) as CarteiraCliente[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  // Mutation para atribuir cliente à carteira
  const atribuirCarteira = useMutation({
    mutationFn: async ({ 
      clienteId, 
      atendenteId, 
      motivo,
      diasExpiracao,
    }: { 
      clienteId: string; 
      atendenteId: string; 
      motivo?: string;
      diasExpiracao?: number;
    }) => {
      // Verificar se já existe atribuição ativa
      const { data: existente } = await supabase
        .from('whatsapp_carteiras')
        .select('id')
        .eq('cliente_id', clienteId)
        .or('expira_em.is.null,expira_em.gt.now()')
        .single();
      
      if (existente) {
        // Atualizar existente
        const { error } = await supabase
          .from('whatsapp_carteiras')
          .update({
            atendente_id: atendenteId,
            motivo_atribuicao: motivo,
            expira_em: diasExpiracao 
              ? new Date(Date.now() + diasExpiracao * 24 * 60 * 60 * 1000).toISOString()
              : null,
          })
          .eq('id', existente.id);
        
        if (error) throw error;
      } else {
        // Criar nova atribuição
        const { error } = await supabase
          .from('whatsapp_carteiras')
          .insert({
            cliente_id: clienteId,
            atendente_id: atendenteId,
            motivo_atribuicao: motivo,
            expira_em: diasExpiracao 
              ? new Date(Date.now() + diasExpiracao * 24 * 60 * 60 * 1000).toISOString()
              : null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras'] });
      toast.success('Cliente atribuído à carteira');
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir: ' + error.message);
    },
  });

  // Mutation para remover da carteira
  const removerCarteira = useMutation({
    mutationFn: async (carteiraId: string) => {
      const { error } = await supabase
        .from('whatsapp_carteiras')
        .update({ expira_em: new Date().toISOString() })
        .eq('id', carteiraId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras'] });
      toast.success('Cliente removido da carteira');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  // Buscar atendente responsável por um cliente
  const buscarAtendenteResponsavel = async (clienteId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('whatsapp_carteiras')
      .select('atendente_id')
      .eq('cliente_id', clienteId)
      .or('expira_em.is.null,expira_em.gt.now()')
      .single();
    
    return data?.atendente_id || null;
  };

  return {
    // Dados
    minhasCarteiras: minhasCarteiras || [],
    todasCarteiras: todasCarteiras || [],
    
    // Loading
    isLoading: isLoadingMinhas || isLoadingTodas,
    
    // Actions
    atribuirCarteira: atribuirCarteira.mutate,
    removerCarteira: removerCarteira.mutate,
    buscarAtendenteResponsavel,
    
    // Pending states
    isAtribuindo: atribuirCarteira.isPending,
    isRemovendo: removerCarteira.isPending,
    
    // Estatísticas
    totalMinhasCarteiras: minhasCarteiras?.length || 0,
    totalTodasCarteiras: todasCarteiras?.length || 0,
    
    // Flags
    isSupervisor: context.isSupervisor,
  };
};

export default useWhatsAppCarteiras;
