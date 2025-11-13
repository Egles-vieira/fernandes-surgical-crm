import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Circle, MessageSquarePlus, Users, Image, Video, Mic, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import NovaConversaDialog from "./NovaConversaDialog";
import ClienteConsultaDialog from "./ClienteConsultaDialog";
interface ConversasListProps {
  contaId: string;
  conversaSelecionada: string | null;
  onSelectConversa: (id: string) => void;
}
const ConversasList = ({
  contaId,
  conversaSelecionada,
  onSelectConversa
}: ConversasListProps) => {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [dialogNovaConversa, setDialogNovaConversa] = useState(false);
  const [dialogConsultaCliente, setDialogConsultaCliente] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: conversas,
    isLoading
  } = useQuery({
    queryKey: ['whatsapp-conversas', contaId, filtroStatus],
    queryFn: async () => {
      let query = supabase.from('whatsapp_conversas').select(`
          *,
          whatsapp_contatos (
            numero_whatsapp,
            nome_whatsapp,
            foto_perfil_url,
            contato_id,
            contatos (
              nome_completo,
              primeiro_nome,
              cargo,
              cliente_id,
              clientes (
                nome_abrev
              )
            )
          ),
          whatsapp_mensagens!whatsapp_mensagens_conversa_id_fkey (
            corpo,
            tipo_mensagem,
            direcao
          )
        `).eq('whatsapp_conta_id', contaId).order('ultima_mensagem_em', {
        ascending: false
      });
      if (filtroStatus !== 'todas') {
        query = query.eq('status', filtroStatus);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      
      // Para cada conversa, contar mensagens não lidas e pegar última mensagem
      const conversasComNaoLidas = await Promise.all(data?.map(async (conversa) => {
        const { count } = await supabase
          .from('whatsapp_mensagens')
          .select('*', { count: 'exact', head: true })
          .eq('conversa_id', conversa.id)
          .eq('direcao', 'recebida')
          .is('status_lida_em', null);
        
        return {
          ...conversa,
          whatsapp_mensagens: conversa.whatsapp_mensagens?.[0] || null,
          mensagens_nao_lidas: count || 0
        };
      }) || []);
      
      return conversasComNaoLidas;
    }
  });
  const conversasFiltradas = conversas?.filter(conversa => {
    if (!busca) return true;
    const nomeContato = conversa.whatsapp_contatos?.contatos?.nome_completo || conversa.whatsapp_contatos?.nome_whatsapp || '';
    return nomeContato.toLowerCase().includes(busca.toLowerCase());
  });

  // Realtime: atualizar contador quando novas mensagens chegarem
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-mensagens-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `whatsapp_conta_id=eq.${contaId}`
        },
        () => {
          // Invalidar query para recarregar conversas com novos contadores
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', contaId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `whatsapp_conta_id=eq.${contaId}`
        },
        () => {
          // Invalidar quando mensagem for marcada como lida
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', contaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contaId, queryClient]);
  const getStatusColor = (status: string) => {
    const colors = {
      aberta: "bg-green-500",
      aguardando: "bg-yellow-500",
      resolvida: "bg-blue-500",
      fechada: "bg-gray-500"
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };
  const getPrioridadeColor = (prioridade: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      urgente: "destructive",
      alta: "destructive",
      normal: "secondary",
      baixa: "outline"
    };
    return colors[prioridade] || "secondary";
  };

  const getMediaIcon = (tipoMensagem: string) => {
    switch (tipoMensagem) {
      case 'imagem':
        return <Image className="w-4 h-4 text-muted-foreground" />;
      case 'video':
        return <Video className="w-4 h-4 text-muted-foreground" />;
      case 'audio':
        return <Mic className="w-4 h-4 text-muted-foreground" />;
      case 'documento':
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getMediaLabel = (tipoMensagem: string) => {
    switch (tipoMensagem) {
      case 'imagem':
        return 'Imagem';
      case 'video':
        return 'Vídeo';
      case 'audio':
        return 'Áudio';
      case 'documento':
        return 'Documento';
      default:
        return '';
    }
  };
  return <>
      <Card className="h-full min-h-0 flex flex-col backdrop-blur border-muted bg-slate-50">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-br from-muted/30 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-green-500 fill-green-500" />
              <span className="text-sm font-medium">Online</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {conversasFiltradas?.length || 0}
            </Badge>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={() => setDialogConsultaCliente(true)} className="flex-1" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Clientes
            </Button>
            
            <Button onClick={() => setDialogNovaConversa(true)} className="flex-1" variant="outline">
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Nova
            </Button>
          </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conversas..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10 bg-background/50" />
        </div>

        <div className="flex gap-2">
          {['todas', 'aberta', 'aguardando', 'resolvida'].map(status => <Badge key={status} variant={filtroStatus === status ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setFiltroStatus(status)}>
              {status}
            </Badge>)}
        </div>
      </div>

      {/* Lista de conversas */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? <div className="p-4 text-center text-muted-foreground">
            Carregando conversas...
          </div> : conversasFiltradas?.length === 0 ? <div className="p-8 text-center text-muted-foreground">
            Nenhuma conversa encontrada
          </div> : conversasFiltradas?.map(conversa => {
          const nomeContato = conversa.whatsapp_contatos?.contatos?.nome_completo || conversa.whatsapp_contatos?.nome_whatsapp || conversa.whatsapp_contatos?.numero_whatsapp;
          const cargo = conversa.whatsapp_contatos?.contatos?.cargo;
          const nomeEmpresa = conversa.whatsapp_contatos?.contatos?.clientes?.nome_abrev;

          // Montar display name: Nome | Cargo | Empresa
          let displayName = nomeContato;
          if (cargo) displayName += ` | ${cargo}`;
          if (nomeEmpresa) displayName += ` | ${nomeEmpresa}`;
          const iniciais = nomeContato?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          return <div key={conversa.id} onClick={() => onSelectConversa(conversa.id)} className={cn("p-4 border-b border-border/30 cursor-pointer transition-all hover:bg-muted/30", conversaSelecionada === conversa.id && "bg-primary/10 border-l-4 border-l-primary")}>
                <div className="flex gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversa.whatsapp_contatos?.foto_perfil_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                        {iniciais}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background", getStatusColor(conversa.status))} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {displayName}
                        </h3>
                        {conversa.emoji_sentimento && <span className="text-lg" title={`Cliente está ${conversa.sentimento_cliente || 'neutro'}`}>
                            {conversa.emoji_sentimento}
                          </span>}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {(conversa as any).mensagens_nao_lidas > 0 && <Badge variant="default" className="bg-primary text-primary-foreground text-xs font-bold min-w-[1.5rem] h-5 flex items-center justify-center rounded-full px-1.5">
                            {(conversa as any).mensagens_nao_lidas}
                          </Badge>}
                        {conversa.ultima_mensagem_em && <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(conversa.ultima_mensagem_em), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                          </span>}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground truncate mb-2 flex items-center gap-1">
                      {conversa.whatsapp_mensagens?.direcao === 'saida' && <span className="text-xs">Você:</span>}
                      {conversa.whatsapp_mensagens?.tipo_mensagem && 
                       conversa.whatsapp_mensagens.tipo_mensagem !== 'texto' ? (
                        <>
                          {getMediaIcon(conversa.whatsapp_mensagens.tipo_mensagem)}
                          <span className="flex-1 truncate">
                            {getMediaLabel(conversa.whatsapp_mensagens.tipo_mensagem)}
                          </span>
                        </>
                      ) : (
                        <span className="flex-1 truncate">
                          {conversa.whatsapp_mensagens?.corpo || 'Nenhuma mensagem ainda'}
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {conversa.prioridade !== 'normal' && <Badge variant={getPrioridadeColor(conversa.prioridade)} className="text-xs">
                          {conversa.prioridade}
                        </Badge>}
                      {conversa.total_mensagens > 0 && <Badge variant="outline" className="text-xs">
                          {conversa.total_mensagens} msgs
                        </Badge>}
                      {conversa.tags && conversa.tags.length > 0 && <Badge variant="outline" className="text-xs">
                          {conversa.tags[0]}
                        </Badge>}
                    </div>
                  </div>
                </div>
              </div>;
        })}
      </ScrollArea>
    </Card>

    <NovaConversaDialog open={dialogNovaConversa} onOpenChange={setDialogNovaConversa} contaId={contaId} onConversaCriada={onSelectConversa} />
    
    <ClienteConsultaDialog open={dialogConsultaCliente} onOpenChange={setDialogConsultaCliente} contaId={contaId} />
    </>;
};
export default ConversasList;