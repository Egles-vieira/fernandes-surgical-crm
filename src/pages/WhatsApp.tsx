import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Settings, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConversasList from "@/components/whatsapp/ConversasList";
import ChatArea from "@/components/whatsapp/ChatArea";
import { ConectarWAPIDialog } from "@/components/whatsapp/ConectarWAPIDialog";
import { StatusDisponibilidadeBadge } from "@/components/whatsapp/StatusDisponibilidadeBadge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
const WhatsApp = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [conectarDialogOpen, setConectarDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: contas
  } = useQuery({
    queryKey: ['whatsapp-contas'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('whatsapp_contas').select('*').is('excluido_em', null).eq('status', 'ativo').order('criado_em', {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });
  const contaAtiva = contas?.[0];

  // Buscar/criar conversa a partir do número na URL
  useEffect(() => {
    const numero = searchParams.get('numero');
    if (!numero || !contaAtiva?.id) return;

    const buscarOuCriarConversa = async () => {
      try {
        // Normalizar número (apenas dígitos)
        const numeroNormalizado = numero.replace(/\D/g, '');
        
        // Buscar contato WhatsApp pelo número
        const { data: contatos } = await supabase
          .from('whatsapp_contatos')
          .select('id')
          .eq('whatsapp_conta_id', contaAtiva.id)
          .or(`numero_whatsapp.eq.${numeroNormalizado},numero_whatsapp.eq.+${numeroNormalizado}`)
          .limit(1);

        let contatoId = contatos?.[0]?.id;

        // Se não encontrou contato, criar
        if (!contatoId) {
          const { data: novoContato, error: erroContato } = await supabase
            .from('whatsapp_contatos')
            .insert({
              whatsapp_conta_id: contaAtiva.id,
              numero_whatsapp: numeroNormalizado,
              nome_whatsapp: numeroNormalizado
            })
            .select()
            .single();

          if (erroContato) throw erroContato;
          contatoId = novoContato.id;
        }

        // Buscar conversa ativa
        const { data: conversas } = await supabase
          .from('whatsapp_conversas')
          .select('id')
          .eq('whatsapp_conta_id', contaAtiva.id)
          .eq('whatsapp_contato_id', contatoId)
          .neq('status', 'fechada')
          .order('criada_em', { ascending: false })
          .limit(1);

        let conversaId = conversas?.[0]?.id;

        // Se não encontrou conversa ativa, criar
        if (!conversaId) {
          const { data: novaConversa, error: erroConversa } = await supabase
            .from('whatsapp_conversas')
            .insert({
              whatsapp_conta_id: contaAtiva.id,
              whatsapp_contato_id: contatoId,
              status: 'aberta'
            })
            .select()
            .single();

          if (erroConversa) throw erroConversa;
          conversaId = novaConversa.id;
          
          // Invalidar queries para atualizar lista
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
        }

        // Selecionar a conversa
        setConversaSelecionada(conversaId);
        
        // Limpar parâmetro da URL
        searchParams.delete('numero');
        setSearchParams(searchParams);
      } catch (error) {
        console.error('Erro ao buscar/criar conversa:', error);
      }
    };

    buscarOuCriarConversa();
  }, [searchParams, contaAtiva, queryClient, setSearchParams]);

  // Configurar Realtime para mensagens e conversas
  useEffect(() => {
    if (!contaAtiva?.id) return;
    const channel = supabase.channel('whatsapp-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'whatsapp_mensagens',
      filter: `whatsapp_conta_id=eq.${contaAtiva.id}`
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens']
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversas']
      });
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'whatsapp_conversas',
      filter: `whatsapp_conta_id=eq.${contaAtiva.id}`
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversas']
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contaAtiva, queryClient]);
  return <div className="fixed top-[64px] right-0 bottom-0 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden" style={{
    left: 'var(--sidebar-width, 4rem)'
  }}>
      {!contaAtiva ? <div className="flex items-center justify-center h-full p-4">
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Nenhuma conta conectada</h2>
            <p className="text-muted-foreground mb-6">
              Configure uma conta WhatsApp Business para começar a gerenciar conversas
            </p>
            <Button onClick={() => window.location.href = '/whatsapp/configuracoes'} className="bg-gradient-to-br from-primary to-primary/90">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Conta
            </Button>
          </Card>
        </div> : <>
          {/* Header com status de conexão */}
          <div className="px-4 py-3 border-b border-border/50 backdrop-blur flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {contaAtiva.status === 'ativo' ? <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Conectado
                    </Badge>
                  </> : <>
                    <WifiOff className="w-4 h-4 text-destructive" />
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      Desconectado
                    </Badge>
                  </>}
              </div>
              <span className="text-sm text-muted-foreground">
                {contaAtiva.nome_conta}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <StatusDisponibilidadeBadge />
              {contaAtiva.provedor === 'w_api' && contaAtiva.status !== 'ativo' && <Button size="sm" onClick={() => setConectarDialogOpen(true)} className="bg-gradient-to-br from-primary to-primary/90">
                  <Wifi className="w-4 h-4 mr-2" />
                  Conectar WhatsApp
                </Button>}
            </div>
          </div>

          <div className="grid grid-cols-12 h-[calc(100%-57px)] min-h-0 overflow-hidden">
            <div className="col-span-4 h-full min-h-0">
              <ConversasList contaId={contaAtiva.id} conversaSelecionada={conversaSelecionada} onSelectConversa={setConversaSelecionada} />
            </div>
            
            {conversaSelecionada && <div className="col-span-8 h-full min-h-0">
                <ChatArea conversaId={conversaSelecionada} contaId={contaAtiva.id} onSolicitarConexao={() => setConectarDialogOpen(true)} />
              </div>}
            
            {!conversaSelecionada && <div className="col-span-8 flex items-center justify-center h-full min-h-0">
                <Card className="p-12 text-center bg-card/30 backdrop-blur">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha uma conversa na lista para começar a atender
                  </p>
                </Card>
              </div>}
          </div>

          <ConectarWAPIDialog open={conectarDialogOpen} onOpenChange={setConectarDialogOpen} contaId={contaAtiva.id} />
        </>}
    </div>;
};
export default WhatsApp;