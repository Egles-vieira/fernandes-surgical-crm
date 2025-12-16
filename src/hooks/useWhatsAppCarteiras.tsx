import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhatsAppContext } from '@/contexts/WhatsAppContext';

export interface CarteiraV2 {
  id: string;
  nome: string;
  descricao: string | null;
  operador_id: string;
  max_contatos: number;
  recebe_novos_contatos: boolean;
  cor: string;
  esta_ativa: boolean;
  criado_em: string;
  criado_por: string | null;
  atualizado_em: string;
  total_contatos: number;
  total_atendimentos: number;
  ultimo_atendimento_em: string | null;
  // Joins
  operador?: {
    id: string;
    nome_completo: string;
  };
}

export interface CarteiraContato {
  id: string;
  carteira_id: string;
  whatsapp_contato_id: string;
  vinculado_em: string;
  vinculado_por: string | null;
  motivo_vinculo: string | null;
  // Joins
  contato?: {
    id: string;
    nome_whatsapp: string;
    numero_whatsapp: string;
  };
}

/**
 * Hook para gerenciamento de carteiras v2 (entidade com múltiplos contatos).
 */
export const useWhatsAppCarteiras = () => {
  const queryClient = useQueryClient();
  const context = useWhatsAppContext();
  const client = supabase as any;

  // Buscar todas as carteiras
  const { data: carteiras, isLoading: isLoadingCarteiras } = useQuery({
    queryKey: ['whatsapp-carteiras-v2'],
    queryFn: async () => {
      const { data, error } = await client
        .from('whatsapp_carteiras_v2')
        .select(`
          *,
          operador:perfis_usuario!whatsapp_carteiras_v2_operador_id_fkey(
            id, nome_completo
          )
        `)
        .eq('esta_ativa', true)
        .order('nome');
      
      if (error) {
        console.warn('Erro ao buscar carteiras:', error);
        return [];
      }
      
      return data as CarteiraV2[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar minhas carteiras (onde sou operador)
  const { data: minhasCarteiras, isLoading: isLoadingMinhas } = useQuery({
    queryKey: ['whatsapp-carteiras-v2-minhas', context.userId],
    queryFn: async () => {
      if (!context.userId) return [];
      
      const { data, error } = await client
        .from('whatsapp_carteiras_v2')
        .select(`
          *,
          operador:perfis_usuario!whatsapp_carteiras_v2_operador_id_fkey(
            id, nome_completo
          )
        `)
        .eq('operador_id', context.userId)
        .eq('esta_ativa', true);
      
      if (error) {
        console.warn('Erro ao buscar minhas carteiras:', error);
        return [];
      }
      
      return data as CarteiraV2[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!context.userId,
  });

  // Buscar contatos de uma carteira específica
  const buscarContatosCarteira = async (carteiraId: string): Promise<CarteiraContato[]> => {
    const { data, error } = await client
      .from('whatsapp_carteiras_contatos')
      .select(`
        *,
        contato:whatsapp_contatos!whatsapp_carteiras_contatos_whatsapp_contato_id_fkey(
          id, nome_whatsapp, numero_whatsapp
        )
      `)
      .eq('carteira_id', carteiraId)
      .order('vinculado_em', { ascending: false });
    
    if (error) {
      console.warn('Erro ao buscar contatos da carteira:', error);
      return [];
    }
    
    return data as CarteiraContato[];
  };

  // Mutation: Criar carteira
  const criarCarteira = useMutation({
    mutationFn: async ({ 
      nome, 
      descricao, 
      operadorId,
      maxContatos,
      recebeNovosContatos,
      cor
    }: { 
      nome: string; 
      descricao?: string;
      operadorId: string;
      maxContatos?: number;
      recebeNovosContatos?: boolean;
      cor?: string;
    }) => {
      const { data, error } = await client
        .from('whatsapp_carteiras_v2')
        .insert({
          nome,
          descricao,
          operador_id: operadorId,
          max_contatos: maxContatos || 50,
          recebe_novos_contatos: recebeNovosContatos !== false,
          cor: cor || '#3b82f6',
          criado_por: context.userId,
          esta_ativa: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar carteira: ' + error.message);
    },
  });

  // Mutation: Atualizar carteira
  const atualizarCarteira = useMutation({
    mutationFn: async ({ 
      carteiraId, 
      dados 
    }: { 
      carteiraId: string; 
      dados: Partial<{
        nome: string;
        descricao: string;
        operador_id: string;
        max_contatos: number;
        recebe_novos_contatos: boolean;
        cor: string;
      }>;
    }) => {
      const { error } = await client
        .from('whatsapp_carteiras_v2')
        .update(dados)
        .eq('id', carteiraId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Mutation: Excluir carteira (soft delete)
  const excluirCarteira = useMutation({
    mutationFn: async (carteiraId: string) => {
      const { error } = await client
        .from('whatsapp_carteiras_v2')
        .update({ esta_ativa: false })
        .eq('id', carteiraId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira excluída');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  // Mutation: Adicionar contato à carteira
  const adicionarContato = useMutation({
    mutationFn: async ({ 
      carteiraId, 
      contatoId, 
      motivo 
    }: { 
      carteiraId: string; 
      contatoId: string; 
      motivo?: string;
    }) => {
      const { error } = await client
        .from('whatsapp_carteiras_contatos')
        .insert({
          carteira_id: carteiraId,
          whatsapp_contato_id: contatoId,
          vinculado_por: context.userId,
          motivo_vinculo: motivo,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Contato adicionado à carteira');
    },
    onError: (error: any) => {
      if (error.message?.includes('unique')) {
        toast.error('Este contato já está em outra carteira');
      } else {
        toast.error('Erro ao adicionar contato: ' + error.message);
      }
    },
  });

  // Mutation: Remover contato da carteira
  const removerContato = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await client
        .from('whatsapp_carteiras_contatos')
        .delete()
        .eq('id', vinculoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Contato removido da carteira');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  // Mutation: Transferir carteira para outro operador
  const transferirCarteira = useMutation({
    mutationFn: async ({ 
      carteiraId, 
      novoOperadorId 
    }: { 
      carteiraId: string; 
      novoOperadorId: string;
    }) => {
      const { error } = await client
        .from('whatsapp_carteiras_v2')
        .update({ operador_id: novoOperadorId })
        .eq('id', carteiraId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira transferida');
    },
    onError: (error: any) => {
      toast.error('Erro ao transferir: ' + error.message);
    },
  });

  // Buscar operador responsável por um contato
  const buscarOperadorResponsavel = async (contatoId: string): Promise<string | null> => {
    const { data } = await client
      .rpc('buscar_operador_carteira', { p_contato_id: contatoId });
    
    return data || null;
  };

  return {
    // Dados
    carteiras: carteiras || [],
    minhasCarteiras: minhasCarteiras || [],
    isLoading: isLoadingCarteiras || isLoadingMinhas,
    
    // Queries
    buscarContatosCarteira,
    buscarOperadorResponsavel,
    
    // Mutations
    criarCarteira: criarCarteira.mutate,
    atualizarCarteira: atualizarCarteira.mutate,
    excluirCarteira: excluirCarteira.mutate,
    adicionarContato: adicionarContato.mutate,
    removerContato: removerContato.mutate,
    transferirCarteira: transferirCarteira.mutate,
    
    // Estados
    isCriando: criarCarteira.isPending,
    isAtualizando: atualizarCarteira.isPending,
    isExcluindo: excluirCarteira.isPending,
    isAdicionandoContato: adicionarContato.isPending,
    isRemovendoContato: removerContato.isPending,
    isTransferindo: transferirCarteira.isPending,
    
    // Métricas
    totalCarteiras: carteiras?.length || 0,
    totalMinhasCarteiras: minhasCarteiras?.length || 0,
    isSupervisor: context.isSupervisor,
  };
};

export default useWhatsAppCarteiras;
