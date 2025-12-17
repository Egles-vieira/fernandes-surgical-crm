// ============================================
// WhatsApp Module v2 - Interface Unificada
// Layout: 3 colunas (Conversas | Chat | Detalhes)
// ============================================

import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ConversationList } from './ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactDetailsPanel } from './ContactDetailsPanel';
import { StatusBar } from './StatusBar';

import { useWhatsAppService } from '@/services/whatsapp/hooks/useWhatsAppService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const { connectionStatus, isConnected } = useWhatsAppService();
  const queryClient = useQueryClient();

  // Fetch conversas
  const { data: conversas = [], isLoading: isLoadingConversas } = useQuery({
    queryKey: ['whatsapp-conversas-v2'],
    queryFn: async () => {
      // Fetch conversations with operator and sector
      const { data: conversasData, error } = await supabase
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
          fila_id,
          whatsapp_contatos (
            id,
            nome_whatsapp,
            numero_whatsapp,
            foto_perfil_url
          )
        `)
        .order('atualizado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!conversasData || conversasData.length === 0) return [];

      // Collect IDs for secondary queries
      const conversaIds = conversasData.map(c => c.id);
      const operadorIds = conversasData
        .map(c => c.atribuida_para_id)
        .filter((id): id is string => !!id);
      const filaIds = conversasData
        .map(c => c.fila_id)
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

      // Fetch sectors
      let setoresMap: Record<string, Setor> = {};
      if (filaIds.length > 0) {
        const { data: setoresData } = await supabase
          .from('filas_atendimento')
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

      return conversasData.map(c => {
        const contato = c.whatsapp_contatos as any;
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
          operador: c.atribuida_para_id ? operadoresMap[c.atribuida_para_id] || null : null,
          setor: c.fila_id ? setoresMap[c.fila_id] || null : null,
          whatsapp_contatos: {
            id: contato?.id || '',
            nome_whatsapp: contato?.nome_whatsapp || '',
            numero_whatsapp: contato?.numero_whatsapp || '',
            foto_url: contato?.foto_perfil_url || undefined,
          },
        };
      }) as Conversa[];
    },
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
