// ============================================
// WhatsApp Module v2 - Interface Unificada
// Layout: 3 colunas (Conversas | Chat | Detalhes)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ConversationList } from './ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactDetailsPanel } from './ContactDetailsPanel';
import { StatusBar } from './StatusBar';

import { useWhatsAppService } from '@/services/whatsapp/hooks/useWhatsAppService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ConversationFiltersState } from '@/hooks/useConversationFilters';

interface Operador {
  id: string;
  primeiro_nome: string | null;
  sobrenome: string | null;
}

interface Setor {
  id: string;
  nome: string;
  cor: string;
}

interface Conversa {
  id: string;
  status: string;
  origem_atendimento: string;
  criado_em: string;
  atualizado_em: string;
  ultima_mensagem_em: string | null;
  ultima_mensagem?: string;
  emoji_sentimento?: string;
  sentimento_cliente?: string;
  nao_lidas: number;
  atribuida_para_id?: string | null;
  em_distribuicao?: boolean;
  agente_ia_ativo?: boolean;
  operador?: Operador | null;
  setor?: Setor | null;
  whatsapp_contatos: {
    id: string;
    nome_whatsapp: string;
    numero_whatsapp: string;
    foto_url?: string;
  };
}

export function WhatsAppModule() {
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [filters, setFilters] = useState<ConversationFiltersState>({
    caixa: 'meus_atendimentos',
    setorId: null,
    canalTipo: 'todos',
    contaId: null,
    searchTerm: '',
    ordenacao: 'mais_recente',
  });
  const [userId, setUserId] = useState<string | null>(null);

  const { connectionStatus, isConnected } = useWhatsAppService();
  const queryClient = useQueryClient();

  // Buscar userId
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: ConversationFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Fetch conversas com filtros aplicados
  const { data: conversas = [], isLoading: isLoadingConversas } = useQuery({
    queryKey: ['whatsapp-conversas-v2', filters, userId],
    queryFn: async () => {
      if (!userId) return [];

      // Build query base
      let query = supabase
        .from('whatsapp_conversas')
        .select(`
          id,
          status,
          origem_atendimento,
          criado_em,
          atualizado_em,
          ultima_mensagem_em,
          emoji_sentimento,
          sentimento_cliente,
          atribuida_para_id,
          em_distribuicao,
          fila_id,
          whatsapp_fila_id,
          whatsapp_conta_id,
          agente_ia_ativo,
          whatsapp_contatos (
            id,
            nome_whatsapp,
            numero_whatsapp,
            foto_perfil_url
          )
        `);

      // Aplicar filtro por caixa
      switch (filters.caixa) {
        case 'meus_atendimentos':
          query = query.eq('atribuida_para_id', userId);
          break;
        case 'fila_espera':
          query = query.is('atribuida_para_id', null).neq('status', 'fechada').neq('status', 'resolvida');
          break;
        case 'chatbot':
          query = query.eq('agente_ia_ativo', true);
          break;
        case 'todos':
        case 'todos_nao_lidas':
        case 'operadores':
          // Não adicionar filtro de atribuição
          break;
        case 'nao_lidas':
          // Será filtrado após buscar mensagens
          query = query.eq('atribuida_para_id', userId);
          break;
      }

      // Filtrar por status (excluir fechadas por padrão)
      if (filters.caixa !== 'todos' && filters.caixa !== 'todos_nao_lidas') {
        query = query.neq('status', 'fechada').neq('status', 'resolvida');
      }

      // Filtrar por setor
      if (filters.setorId) {
        query = query.or(`fila_id.eq.${filters.setorId},whatsapp_fila_id.eq.${filters.setorId}`);
      }

      // Filtrar por conta
      if (filters.contaId) {
        query = query.eq('whatsapp_conta_id', filters.contaId);
      }

      // Ordenação
      const ascending = filters.ordenacao === 'mais_antiga';
      query = query.order('atualizado_em', { ascending });

      query = query.limit(100);

      const { data: conversasData, error } = await query;

      if (error) throw error;
      if (!conversasData || conversasData.length === 0) return [];

      // Collect IDs for secondary queries
      const conversaIds = conversasData.map(c => c.id);
      const operadorIds = conversasData
        .map(c => c.atribuida_para_id)
        .filter((id): id is string => !!id);
      const filaIds = conversasData
        .map(c => c.fila_id || c.whatsapp_fila_id)
        .filter((id): id is string => !!id);

      // Fetch operators
      let operadoresMap: Record<string, Operador> = {};
      if (operadorIds.length > 0) {
        const { data: operadoresData } = await supabase
          .from('perfis_usuario')
          .select('id, primeiro_nome, sobrenome')
          .in('id', operadorIds);
        if (operadoresData) {
          for (const op of operadoresData) {
            operadoresMap[op.id] = op;
          }
        }
      }

      // Fetch sectors from whatsapp_filas
      let setoresMap: Record<string, Setor> = {};
      if (filaIds.length > 0) {
        const { data: setoresData } = await supabase
          .from('whatsapp_filas')
          .select('id, nome, cor')
          .in('id', filaIds);
        if (setoresData) {
          for (const s of setoresData) {
            setoresMap[s.id] = s;
          }
        }
      }

      // Fetch last message for each conversation
      const { data: mensagensData } = await supabase
        .from('whatsapp_mensagens')
        .select('conversa_id, corpo, criado_em')
        .in('conversa_id', conversaIds)
        .order('criado_em', { ascending: false });

      // Fetch unread count per conversation
      const { data: naoLidasData } = await supabase
        .from('whatsapp_mensagens')
        .select('conversa_id')
        .in('conversa_id', conversaIds)
        .eq('direcao', 'recebida')
        .is('status_lida_em', null);

      // Count unread per conversation
      const naoLidasMap: Record<string, number> = {};
      if (naoLidasData) {
        for (const msg of naoLidasData) {
          naoLidasMap[msg.conversa_id] = (naoLidasMap[msg.conversa_id] || 0) + 1;
        }
      }

      // Map last message per conversation
      const ultimaMensagemMap: Record<string, string> = {};
      if (mensagensData) {
        for (const msg of mensagensData) {
          if (!ultimaMensagemMap[msg.conversa_id]) {
            ultimaMensagemMap[msg.conversa_id] = msg.corpo || '';
          }
        }
      }

      let result = conversasData.map(c => {
        const contato = c.whatsapp_contatos as any;
        const filaIdToUse = c.fila_id || c.whatsapp_fila_id;
        return {
          id: c.id,
          status: c.status,
          origem_atendimento: c.origem_atendimento,
          criado_em: c.criado_em,
          atualizado_em: c.atualizado_em,
          ultima_mensagem_em: c.ultima_mensagem_em,
          emoji_sentimento: c.emoji_sentimento,
          sentimento_cliente: c.sentimento_cliente,
          ultima_mensagem: ultimaMensagemMap[c.id] || '',
          nao_lidas: naoLidasMap[c.id] || 0,
          atribuida_para_id: c.atribuida_para_id,
          em_distribuicao: c.em_distribuicao,
          agente_ia_ativo: c.agente_ia_ativo,
          operador: c.atribuida_para_id ? operadoresMap[c.atribuida_para_id] || null : null,
          setor: filaIdToUse ? setoresMap[filaIdToUse] || null : null,
          whatsapp_contatos: {
            id: contato?.id || '',
            nome_whatsapp: contato?.nome_whatsapp || '',
            numero_whatsapp: contato?.numero_whatsapp || '',
            foto_url: contato?.foto_perfil_url || undefined,
          },
        };
      }) as Conversa[];

      // Filtrar por não lidas se necessário
      if (filters.caixa === 'nao_lidas' || filters.caixa === 'todos_nao_lidas') {
        result = result.filter(c => c.nao_lidas > 0);
      }

      // Ordenar por não lidas primeiro se selecionado
      if (filters.ordenacao === 'nao_lidas_primeiro') {
        result.sort((a, b) => b.nao_lidas - a.nao_lidas);
      }

      return result;
    },
    enabled: !!userId,
  });

  // Realtime listener para atualizar lista quando conversas mudam
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-conversas-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversas',
        },
        (payload) => {
          console.log('🔄 Conversa atualizada via Realtime:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas-v2'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversaId && conversas.length > 0) {
      setSelectedConversaId(conversas[0].id);
    }
  }, [conversas, selectedConversaId]);

  const selectedConversa = conversas.find(c => c.id === selectedConversaId);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background">

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Panel 1: Conversation List */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <ConversationList
              conversas={conversas}
              selectedId={selectedConversaId}
              onSelect={setSelectedConversaId}
              isLoading={isLoadingConversas}
              onFiltersChange={handleFiltersChange}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Panel 2: Chat Area */}
          <ResizablePanel defaultSize={showDetailsPanel ? 50 : 75} minSize={40}>
            <ChatPanel
              conversaId={selectedConversaId}
              contato={selectedConversa?.whatsapp_contatos}
              onToggleDetails={() => setShowDetailsPanel(!showDetailsPanel)}
              showDetailsButton={!showDetailsPanel}
              conversaInfo={selectedConversa ? {
                atribuida_para_id: selectedConversa.atribuida_para_id || null,
                em_distribuicao: selectedConversa.em_distribuicao || false,
                agente_ia_ativo: selectedConversa.agente_ia_ativo ?? true,
              } : undefined}
            />
          </ResizablePanel>

          {/* Panel 3: Contact Details (conditionally shown) */}
          {showDetailsPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                <ContactDetailsPanel
                  contato={selectedConversa?.whatsapp_contatos}
                  conversaId={selectedConversaId}
                  onClose={() => setShowDetailsPanel(false)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar
        isConnected={isConnected}
        phoneNumberId={connectionStatus?.phoneNumberId}
        qualityRating={connectionStatus?.qualityRating}
      />
    </div>
  );
}
