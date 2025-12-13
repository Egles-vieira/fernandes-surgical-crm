import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// ============= TYPES =============
export type StatusAtendimento = 'online' | 'ocupado' | 'pausa' | 'offline';
export type ModoDistribuicao = 'round_robin' | 'menos_ocupado' | 'por_carteira' | 'manual';

export interface WhatsAppConversaResumo {
  id: string;
  numero_protocolo: string | null;
  status: string;
  prioridade: number;
  atendente_id: string | null;
  cliente_nome: string | null;
  ultima_mensagem_em: string | null;
  nao_lidas: number;
  tempo_espera_segundos: number | null;
}

export interface WhatsAppOperador {
  id: string;
  nome_completo: string;
  status_atendimento: StatusAtendimento;
  conversas_ativas: number;
  max_conversas_simultaneas: number;
  unidade_id: string | null;
}

export interface WhatsAppConfiguracao {
  id: string;
  modo_api: 'oficial' | 'nao_oficial';
  provedor_ativo: 'gupshup' | 'w_api' | 'meta';
  esta_ativo: boolean;
}

export interface WhatsAppUnidade {
  id: string;
  nome: string;
  codigo: string;
  esta_ativa: boolean;
}

export interface WhatsAppContextState {
  // Configuração global
  configuracao: WhatsAppConfiguracao | null;
  isLoadingConfig: boolean;
  
  // Status do usuário atual
  statusAtual: StatusAtendimento;
  isChangingStatus: boolean;
  
  // Conversas do usuário
  minhasConversas: WhatsAppConversaResumo[];
  conversaSelecionadaId: string | null;
  
  // Fila de espera (para supervisores)
  filaEspera: WhatsAppConversaResumo[];
  
  // Operadores (para supervisores)
  operadores: WhatsAppOperador[];
  
  // Unidades
  unidades: WhatsAppUnidade[];
  
  // Contadores
  totalNaoLidas: number;
  totalFilaEspera: number;
  
  // User info
  userId: string | null;
  isAdmin: boolean;
  isSupervisor: boolean;
}

export interface WhatsAppContextActions {
  // Status
  changeStatus: (novoStatus: StatusAtendimento) => Promise<void>;
  
  // Conversas
  selecionarConversa: (conversaId: string | null) => void;
  assumirConversa: (conversaId: string) => Promise<void>;
  transferirConversa: (conversaId: string, novoAtendenteId: string) => Promise<void>;
  encerrarConversa: (conversaId: string, codigoDisposicaoId?: string) => Promise<void>;
  
  // Distribuição
  distribuirProximaConversa: () => Promise<void>;
  
  // Refresh
  refreshData: () => void;
}

export type WhatsAppContextValue = WhatsAppContextState & WhatsAppContextActions;

// ============= CONTEXT =============
const WhatsAppContext = createContext<WhatsAppContextValue | undefined>(undefined);

// ============= PROVIDER =============
interface WhatsAppProviderProps {
  children: React.ReactNode;
}

export const WhatsAppProvider: React.FC<WhatsAppProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  
  // State
  const [configuracao, setConfiguracao] = useState<WhatsAppConfiguracao | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [statusAtual, setStatusAtual] = useState<StatusAtendimento>('offline');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [minhasConversas, setMinhasConversas] = useState<WhatsAppConversaResumo[]>([]);
  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<string | null>(null);
  const [filaEspera, setFilaEspera] = useState<WhatsAppConversaResumo[]>([]);
  const [operadores, setOperadores] = useState<WhatsAppOperador[]>([]);
  const [unidades, setUnidades] = useState<WhatsAppUnidade[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);

  // ============= LOAD INITIAL DATA =============
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setUserId(user.id);

        // Carregar configuração global
        const { data: config } = await supabase
          .from('whatsapp_configuracao_global')
          .select('*')
          .eq('esta_ativo', true)
          .single();
        
        if (config) {
          setConfiguracao(config as WhatsAppConfiguracao);
        }
        
        // Carregar status do usuário
        const { data: perfil } = await supabase
          .from('perfis_usuario')
          .select('status_atendimento')
          .eq('id', user.id)
          .single();
        
        if (perfil?.status_atendimento) {
          setStatusAtual(perfil.status_atendimento as StatusAtendimento);
        }

        // Verificar roles do usuário
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const userRoles = roles?.map(r => r.role) || [];
        setIsAdmin(userRoles.includes('admin'));
        setIsSupervisor(userRoles.includes('gerente_comercial') || userRoles.includes('admin'));

        // Carregar unidades (tabela pode não existir ainda)
        try {
          const { data: unidadesData } = await supabase
            .from('whatsapp_unidades' as any)
            .select('id, nome, codigo, esta_ativa')
            .eq('esta_ativa', true)
            .order('nome');
          
          if (unidadesData) {
            setUnidades(unidadesData as any as WhatsAppUnidade[]);
          }
        } catch {
          console.log('Tabela whatsapp_unidades não disponível');
        }

      } catch (error) {
        console.error('Erro ao carregar dados iniciais WhatsApp:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadInitialData();
  }, []);

  // ============= LOAD CONVERSAS =============
  const loadMinhasConversas = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data } = await supabase
        .from('whatsapp_conversas')
        .select(`
          id,
          numero_protocolo,
          status,
          prioridade,
          atribuida_para_id,
          ultima_mensagem_em,
          nao_lidas,
          whatsapp_contatos!inner(nome)
        `)
        .eq('atribuida_para_id', userId)
        .in('status', ['aberto', 'em_atendimento', 'aguardando_cliente'])
        .order('ultima_mensagem_em', { ascending: false })
        .limit(50);
      
      if (data) {
        const conversas: WhatsAppConversaResumo[] = (data as any[]).map((c) => ({
          id: c.id,
          numero_protocolo: c.numero_protocolo,
          status: c.status,
          prioridade: c.prioridade || 0,
          atendente_id: c.atribuida_para_id,
          cliente_nome: c.whatsapp_contatos?.nome || 'Desconhecido',
          ultima_mensagem_em: c.ultima_mensagem_em,
          nao_lidas: c.nao_lidas || 0,
          tempo_espera_segundos: null,
        }));
        setMinhasConversas(conversas);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  }, [userId]);

  // ============= LOAD FILA ESPERA (SUPERVISORES) =============
  const loadFilaEspera = useCallback(async () => {
    if (!isSupervisor) return;
    
    try {
      const { data } = await supabase
        .from('whatsapp_fila_espera' as any)
        .select(`
          id,
          conversa_id,
          prioridade,
          entrou_fila_em,
          atendido_em
        `)
        .is('atendido_em', null)
        .order('prioridade', { ascending: false })
        .order('entrou_fila_em', { ascending: true })
        .limit(100);
      
      if (data) {
        const fila: WhatsAppConversaResumo[] = (data as any[]).map((f) => {
          const tempoEspera = f.entrou_fila_em 
            ? Math.floor((Date.now() - new Date(f.entrou_fila_em).getTime()) / 1000)
            : 0;
          
          return {
            id: f.conversa_id,
            numero_protocolo: null,
            status: 'aguardando',
            prioridade: f.prioridade || 0,
            atendente_id: null,
            cliente_nome: 'Aguardando',
            ultima_mensagem_em: null,
            nao_lidas: 0,
            tempo_espera_segundos: tempoEspera,
          };
        });
        setFilaEspera(fila);
      }
    } catch (error) {
      console.error('Erro ao carregar fila de espera:', error);
    }
  }, [isSupervisor]);

  // ============= LOAD OPERADORES (SUPERVISORES) =============
  const loadOperadores = useCallback(async () => {
    if (!isSupervisor) return;
    
    try {
      const { data } = await supabase
        .from('perfis_usuario')
        .select(`
          id,
          nome_completo,
          status_atendimento,
          whatsapp_max_conversas,
          whatsapp_unidade_id
        `)
        .not('status_atendimento', 'is', null)
        .order('nome_completo');
      
      if (data) {
        // Contar conversas ativas por operador
        const { data: contagens } = await supabase
          .from('whatsapp_conversas')
          .select('atendente_id')
          .in('status', ['aberto', 'em_atendimento', 'aguardando_cliente']);
        
        const contagemMap: Record<string, number> = {};
        contagens?.forEach((c: any) => {
          if (c.atendente_id) {
            contagemMap[c.atendente_id] = (contagemMap[c.atendente_id] || 0) + 1;
          }
        });
        
        const ops: WhatsAppOperador[] = data.map((p: any) => ({
          id: p.id,
          nome_completo: p.nome_completo || 'Sem nome',
          status_atendimento: p.status_atendimento as StatusAtendimento,
          conversas_ativas: contagemMap[p.id] || 0,
          max_conversas_simultaneas: p.whatsapp_max_conversas || 5,
          unidade_id: p.whatsapp_unidade_id,
        }));
        setOperadores(ops);
      }
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
    }
  }, [isSupervisor]);

  // ============= REALTIME LISTENERS =============
  useEffect(() => {
    if (!userId) return;

    // Listener para minhas conversas (filtrado por atendente_id)
    const conversasChannel = supabase
      .channel(`whatsapp-conversas-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversas',
          filter: `atendente_id=eq.${userId}`,
        },
        () => {
          loadMinhasConversas();
        }
      )
      .subscribe();

    // Listener para status do próprio usuário
    const statusChannel = supabase
      .channel(`whatsapp-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'perfis_usuario',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new?.status_atendimento) {
            setStatusAtual(payload.new.status_atendimento as StatusAtendimento);
          }
        }
      )
      .subscribe();

    // Carregar dados iniciais
    loadMinhasConversas();

    return () => {
      supabase.removeChannel(conversasChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [userId, loadMinhasConversas]);

  // Listeners para supervisores
  useEffect(() => {
    if (!isSupervisor) return;

    const filaChannel = supabase
      .channel('whatsapp-fila-supervisores')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_fila_espera',
        },
        () => {
          loadFilaEspera();
        }
      )
      .subscribe();

    const operadoresChannel = supabase
      .channel('whatsapp-operadores-supervisores')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'perfis_usuario',
        },
        () => {
          loadOperadores();
        }
      )
      .subscribe();

    loadFilaEspera();
    loadOperadores();

    return () => {
      supabase.removeChannel(filaChannel);
      supabase.removeChannel(operadoresChannel);
    };
  }, [isSupervisor, loadFilaEspera, loadOperadores]);

  // ============= ACTIONS =============
  const changeStatus = useCallback(async (novoStatus: StatusAtendimento) => {
    if (!userId || isChangingStatus) return;
    
    setIsChangingStatus(true);
    try {
      const { error } = await supabase
        .from('perfis_usuario')
        .update({ status_atendimento: novoStatus })
        .eq('id', userId);
      
      if (error) throw error;
      setStatusAtual(novoStatus);
    } catch (error) {
      console.error('Erro ao mudar status:', error);
      throw error;
    } finally {
      setIsChangingStatus(false);
    }
  }, [userId, isChangingStatus]);

  const selecionarConversa = useCallback((conversaId: string | null) => {
    setConversaSelecionadaId(conversaId);
  }, []);

  const assumirConversa = useCallback(async (conversaId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_conversas')
        .update({
          atribuida_para_id: userId,
          status: 'em_atendimento',
        } as any)
        .eq('id', conversaId);
      
      if (error) throw error;
      
      // Remover da fila se existir
      await supabase
        .from('whatsapp_fila_espera' as any)
        .update({ atendido_em: new Date().toISOString() } as any)
        .eq('conversa_id', conversaId);
      
      loadMinhasConversas();
      if (isSupervisor) loadFilaEspera();
    } catch (error) {
      console.error('Erro ao assumir conversa:', error);
      throw error;
    }
  }, [userId, isSupervisor, loadMinhasConversas, loadFilaEspera]);

  const transferirConversa = useCallback(async (conversaId: string, novoAtendenteId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_conversas')
        .update({
          atribuida_para_id: novoAtendenteId,
        } as any)
        .eq('id', conversaId);
      
      if (error) throw error;
      loadMinhasConversas();
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      throw error;
    }
  }, [loadMinhasConversas]);

  const encerrarConversa = useCallback(async (conversaId: string, codigoDisposicaoId?: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_conversas')
        .update({
          status: 'encerrado',
          encerrado_em: new Date().toISOString(),
          codigo_disposicao_id: codigoDisposicaoId,
        })
        .eq('id', conversaId);
      
      if (error) throw error;
      
      if (conversaSelecionadaId === conversaId) {
        setConversaSelecionadaId(null);
      }
      loadMinhasConversas();
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error);
      throw error;
    }
  }, [conversaSelecionadaId, loadMinhasConversas]);

  const distribuirProximaConversa = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-distribuir-conversa');
      if (error) throw error;
      loadFilaEspera();
    } catch (error) {
      console.error('Erro ao distribuir conversa:', error);
      throw error;
    }
  }, [loadFilaEspera]);

  const refreshData = useCallback(() => {
    loadMinhasConversas();
    if (isSupervisor) {
      loadFilaEspera();
      loadOperadores();
    }
    queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
  }, [loadMinhasConversas, loadFilaEspera, loadOperadores, isSupervisor, queryClient]);

  // ============= COMPUTED VALUES =============
  const totalNaoLidas = useMemo(() => 
    minhasConversas.reduce((acc, c) => acc + c.nao_lidas, 0),
    [minhasConversas]
  );

  const totalFilaEspera = useMemo(() => filaEspera.length, [filaEspera]);

  // ============= CONTEXT VALUE =============
  const value: WhatsAppContextValue = useMemo(() => ({
    // State
    configuracao,
    isLoadingConfig,
    statusAtual,
    isChangingStatus,
    minhasConversas,
    conversaSelecionadaId,
    filaEspera,
    operadores,
    unidades,
    totalNaoLidas,
    totalFilaEspera,
    userId,
    isAdmin,
    isSupervisor,
    
    // Actions
    changeStatus,
    selecionarConversa,
    assumirConversa,
    transferirConversa,
    encerrarConversa,
    distribuirProximaConversa,
    refreshData,
  }), [
    configuracao,
    isLoadingConfig,
    statusAtual,
    isChangingStatus,
    minhasConversas,
    conversaSelecionadaId,
    filaEspera,
    operadores,
    unidades,
    totalNaoLidas,
    totalFilaEspera,
    userId,
    isAdmin,
    isSupervisor,
    changeStatus,
    selecionarConversa,
    assumirConversa,
    transferirConversa,
    encerrarConversa,
    distribuirProximaConversa,
    refreshData,
  ]);

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
};

// ============= HOOK PRINCIPAL =============
export const useWhatsAppContext = (): WhatsAppContextValue => {
  const context = useContext(WhatsAppContext);
  if (context === undefined) {
    throw new Error('useWhatsAppContext must be used within a WhatsAppProvider');
  }
  return context;
};

export default WhatsAppContext;
