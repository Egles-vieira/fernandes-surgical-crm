import { useState, useEffect } from "react";
import { MessageSquare, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConversasList from "@/components/whatsapp/ConversasList";
import ChatArea from "@/components/whatsapp/ChatArea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WhatsApp = () => {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: contas } = useQuery({
    queryKey: ['whatsapp-contas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .is('excluido_em', null)
        .eq('status', 'ativo')
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const contaAtiva = contas?.[0];

  // Configurar Realtime para mensagens e conversas
  useEffect(() => {
    if (!contaAtiva?.id) return;

    const channel = supabase
      .channel('whatsapp-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `whatsapp_conta_id=eq.${contaAtiva.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversas',
          filter: `whatsapp_conta_id=eq.${contaAtiva.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contaAtiva, queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="h-[calc(100vh-2rem)]">
        {!contaAtiva ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Nenhuma conta conectada</h2>
            <p className="text-muted-foreground mb-6">
              Configure uma conta WhatsApp Business para começar a gerenciar conversas
            </p>
            <Button 
              onClick={() => window.location.href = '/whatsapp/configuracoes'}
              className="bg-gradient-to-br from-primary to-primary/90"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Conta
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
            <div className="col-span-4">
              <ConversasList
                contaId={contaAtiva.id}
                conversaSelecionada={conversaSelecionada}
                onSelectConversa={setConversaSelecionada}
              />
            </div>
            
        {conversaSelecionada && (
          <div className="col-span-8">
            <ChatArea
              conversaId={conversaSelecionada}
              contaId={contaAtiva.id}
            />
          </div>
        )}
        
        {!conversaSelecionada && (
          <div className="col-span-8 flex items-center justify-center">
            <Card className="p-12 text-center bg-card/30 backdrop-blur">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma conversa na lista para começar a atender
              </p>
            </Card>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsApp;
