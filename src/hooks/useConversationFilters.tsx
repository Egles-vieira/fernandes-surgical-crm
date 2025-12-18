// ============================================
// Hook para gerenciar filtros de conversas WhatsApp
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CaixaTipo = 
  | 'meus_atendimentos' 
  | 'nao_lidas' 
  | 'fila_espera' 
  | 'chatbot' 
  | 'operadores' 
  | 'todos' 
  | 'todos_nao_lidas';

export type OrdenacaoTipo = 
  | 'mais_recente' 
  | 'mais_antiga' 
  | 'nao_lidas_primeiro' 
  | 'prioridade';

export interface ConversationFiltersState {
  caixa: CaixaTipo;
  setorId: string | null;
  canalTipo: string;
  contaId: string | null;
  searchTerm: string;
  ordenacao: OrdenacaoTipo;
}

export interface Contadores {
  meus_atendimentos: number;
  nao_lidas: number;
  fila_espera: number;
  chatbot: number;
  todos: number;
  todos_nao_lidas: number;
}

export interface Setor {
  id: string;
  nome: string;
  cor: string | null;
}

export interface Conta {
  id: string;
  nome: string;
  numero_telefone: string | null;
  canal_tipo: string;
}

const defaultFilters: ConversationFiltersState = {
  caixa: 'meus_atendimentos',
  setorId: null,
  canalTipo: 'todos',
  contaId: null,
  searchTerm: '',
  ordenacao: 'mais_recente',
};

export function useConversationFilters() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ConversationFiltersState>(defaultFilters);
  const [userId, setUserId] = useState<string | null>(null);

  // Buscar userId atual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Query para contadores usando RPC
  const { data: contadores, isLoading: isLoadingContadores } = useQuery({
    queryKey: ['whatsapp-filtros-contadores', userId],
    queryFn: async (): Promise<Contadores | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase.rpc('fn_whatsapp_contadores_usuario', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Erro ao buscar contadores:', error);
        return {
          meus_atendimentos: 0,
          nao_lidas: 0,
          fila_espera: 0,
          chatbot: 0,
          todos: 0,
          todos_nao_lidas: 0,
        };
      }
      
      // Parse the JSON response from Postgres
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed as Contadores;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 segundos de cache
    refetchInterval: 60000, // Refetch a cada 60s
  });

  // Query para setores (whatsapp_filas)
  const { data: setores = [], isLoading: isLoadingSetores } = useQuery({
    queryKey: ['whatsapp-filas-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_filas')
        .select('id, nome, cor')
        .eq('esta_ativa', true)
        .order('nome');
      
      if (error) {
        console.error('Erro ao buscar filas:', error);
        return [];
      }
      
      return data as Setor[];
    },
    staleTime: 300000, // 5 minutos
  });

  // Query para contas (whatsapp_contas)
  const { data: contas = [], isLoading: isLoadingContas } = useQuery({
    queryKey: ['whatsapp-contas-ativas'],
    queryFn: async (): Promise<Conta[]> => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('id, nome_conta, numero_whatsapp')
        .eq('status', 'ativo')
        .order('nome_conta');
      
      if (error) {
        console.error('Erro ao buscar contas:', error);
        return [];
      }
      
      // Por enquanto, todas são WhatsApp
      return (data || []).map(c => ({
        id: c.id,
        nome: c.nome_conta || '',
        numero_telefone: c.numero_whatsapp,
        canal_tipo: 'whatsapp'
      }));
    },
    staleTime: 300000, // 5 minutos
  });

  // Realtime para atualizar contadores
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`whatsapp-contadores-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversas',
        },
        () => {
          // Invalidar cache dos contadores quando conversas mudam
          queryClient.invalidateQueries({ queryKey: ['whatsapp-filtros-contadores'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_mensagens',
        },
        () => {
          // Invalidar quando mensagens mudam (pode afetar contador de não lidas)
          queryClient.invalidateQueries({ queryKey: ['whatsapp-filtros-contadores'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Funções para atualizar filtros
  const updateFilter = <K extends keyof ConversationFiltersState>(
    key: K, 
    value: ConversationFiltersState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const setCaixa = (caixa: CaixaTipo) => updateFilter('caixa', caixa);
  const setSetorId = (setorId: string | null) => updateFilter('setorId', setorId);
  const setCanalTipo = (canalTipo: string) => updateFilter('canalTipo', canalTipo);
  const setContaId = (contaId: string | null) => updateFilter('contaId', contaId);
  const setSearchTerm = (searchTerm: string) => updateFilter('searchTerm', searchTerm);
  const setOrdenacao = (ordenacao: OrdenacaoTipo) => updateFilter('ordenacao', ordenacao);

  const resetFilters = () => setFilters(defaultFilters);

  // Label da caixa atual para exibição
  const caixaLabel = useMemo(() => {
    const labels: Record<CaixaTipo, string> = {
      meus_atendimentos: 'Meus Atendimentos',
      nao_lidas: 'Não Lidas',
      fila_espera: 'Fila de Espera',
      chatbot: 'ChatBot',
      operadores: 'Operadores',
      todos: 'Todos',
      todos_nao_lidas: 'Todos (não lidas)',
    };
    return labels[filters.caixa];
  }, [filters.caixa]);

  // Contador da caixa atual
  const contadorCaixaAtual = useMemo(() => {
    if (!contadores) return 0;
    return contadores[filters.caixa as keyof Contadores] || 0;
  }, [contadores, filters.caixa]);

  return {
    // Estado dos filtros
    filters,
    setFilters,
    
    // Setters individuais
    setCaixa,
    setSetorId,
    setCanalTipo,
    setContaId,
    setSearchTerm,
    setOrdenacao,
    resetFilters,
    
    // Dados de referência
    contadores,
    setores,
    contas,
    userId,
    
    // Estados de loading
    isLoadingContadores,
    isLoadingSetores,
    isLoadingContas,
    
    // Helpers
    caixaLabel,
    contadorCaixaAtual,
  };
}
