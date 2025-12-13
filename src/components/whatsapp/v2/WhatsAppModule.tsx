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
import { TokenAlertBanner } from '../TokenAlertBanner';
import { useWhatsAppService } from '@/services/whatsapp/hooks/useWhatsAppService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Conversa {
  id: string;
  status: string;
  origem_atendimento: string;
  criado_em: string;
  atualizado_em: string;
  ultima_mensagem?: string;
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

  // Fetch conversas
  const { data: conversas = [], isLoading: isLoadingConversas } = useQuery({
    queryKey: ['whatsapp-conversas-v2'],
    queryFn: async () => {
      // Fetch conversations
      const { data: conversasData, error } = await supabase
        .from('whatsapp_conversas')
        .select(`
          id,
          status,
          origem_atendimento,
          criado_em,
          atualizado_em,
          whatsapp_contatos (
            id,
            nome_whatsapp,
            numero_whatsapp
          )
        `)
        .order('atualizado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!conversasData || conversasData.length === 0) return [];

      // Fetch last message for each conversation
      const conversaIds = conversasData.map(c => c.id);
      const { data: mensagensData } = await supabase
        .from('whatsapp_mensagens')
        .select('conversa_id, corpo, criado_em')
        .in('conversa_id', conversaIds)
        .order('criado_em', { ascending: false });

      // Map last message per conversation
      const ultimaMensagemMap: Record<string, string> = {};
      if (mensagensData) {
        for (const msg of mensagensData) {
          if (!ultimaMensagemMap[msg.conversa_id]) {
            ultimaMensagemMap[msg.conversa_id] = msg.corpo || '';
          }
        }
      }

      return conversasData.map(c => ({
        ...c,
        ultima_mensagem: ultimaMensagemMap[c.id] || ''
      })) as Conversa[];
    },
  });

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversaId && conversas.length > 0) {
      setSelectedConversaId(conversas[0].id);
    }
  }, [conversas, selectedConversaId]);

  const selectedConversa = conversas.find(c => c.id === selectedConversaId);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background">
      {/* Token Alert Banner */}
      <TokenAlertBanner />

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
