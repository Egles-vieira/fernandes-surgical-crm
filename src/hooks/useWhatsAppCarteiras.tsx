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

/**
 * Hook para gerenciamento de carteiras (sticky agent).
 */
export const useWhatsAppCarteiras = () => {
  const queryClient = useQueryClient();
  const context = useWhatsAppContext();
  const client = supabase as any;

  const { data: minhasCarteiras, isLoading: isLoadingMinhas } = useQuery({
    queryKey: ['whatsapp-carteiras-minhas', context.userId],
    queryFn: async () => {
      if (!context.userId) return [];
      
      const { data, error } = await client
        .from('whatsapp_carteiras')
        .select('*')
        .eq('operador_id', context.userId)
        .eq('esta_ativo', true);
      
      if (error) {
        console.warn('Tabela whatsapp_carteiras não disponível');
        return [];
      }
      
      return (data || []).map((c: any) => ({
        id: c.id,
        cliente_id: c.whatsapp_contato_id,
        atendente_id: c.operador_id,
        motivo_atribuicao: c.motivo_transferencia,
        criado_em: c.criado_em,
        expira_em: null,
      })) as CarteiraCliente[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!context.userId,
  });

  const { data: todasCarteiras, isLoading: isLoadingTodas } = useQuery({
    queryKey: ['whatsapp-carteiras-todas'],
    queryFn: async () => {
      const { data, error } = await client
        .from('whatsapp_carteiras')
        .select('*')
        .eq('esta_ativo', true)
        .order('criado_em', { ascending: false })
        .limit(200);
      
      if (error) return [];
      
      return (data || []).map((c: any) => ({
        id: c.id,
        cliente_id: c.whatsapp_contato_id,
        atendente_id: c.operador_id,
        motivo_atribuicao: c.motivo_transferencia,
        criado_em: c.criado_em,
        expira_em: null,
      })) as CarteiraCliente[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  const atribuirCarteira = useMutation({
    mutationFn: async ({ 
      clienteId, 
      atendenteId, 
      motivo,
    }: { 
      clienteId: string; 
      atendenteId: string; 
      motivo?: string;
      diasExpiracao?: number;
    }) => {
      const { data: existente } = await client
        .from('whatsapp_carteiras')
        .select('id')
        .eq('whatsapp_contato_id', clienteId)
        .eq('esta_ativo', true)
        .single();
      
      if (existente) {
        const { error } = await client
          .from('whatsapp_carteiras')
          .update({
            operador_id: atendenteId,
            motivo_transferencia: motivo,
          })
          .eq('id', existente.id);
        
        if (error) throw error;
      } else {
        const { error } = await client
          .from('whatsapp_carteiras')
          .insert({
            whatsapp_contato_id: clienteId,
            operador_id: atendenteId,
            motivo_transferencia: motivo,
            esta_ativo: true,
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

  const removerCarteira = useMutation({
    mutationFn: async (carteiraId: string) => {
      const { error } = await client
        .from('whatsapp_carteiras')
        .update({ esta_ativo: false })
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

  const buscarAtendenteResponsavel = async (clienteId: string): Promise<string | null> => {
    const { data } = await client
      .from('whatsapp_carteiras')
      .select('operador_id')
      .eq('whatsapp_contato_id', clienteId)
      .eq('esta_ativo', true)
      .single();
    
    return data?.operador_id || null;
  };

  return {
    minhasCarteiras: minhasCarteiras || [],
    todasCarteiras: todasCarteiras || [],
    isLoading: isLoadingMinhas || isLoadingTodas,
    atribuirCarteira: atribuirCarteira.mutate,
    removerCarteira: removerCarteira.mutate,
    buscarAtendenteResponsavel,
    isAtribuindo: atribuirCarteira.isPending,
    isRemovendo: removerCarteira.isPending,
    totalMinhasCarteiras: minhasCarteiras?.length || 0,
    totalTodasCarteiras: todasCarteiras?.length || 0,
    isSupervisor: context.isSupervisor,
  };
};

export default useWhatsAppCarteiras;
