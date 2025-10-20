import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical,
  MessageSquare,
  Clock,
  CheckCheck,
  ChevronRight,
  Mail,
  Building2,
  Briefcase,
  Tag,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface ChatAreaProps {
  conversaId: string | null;
  contaId: string;
}

const ChatArea = ({ conversaId, contaId }: ChatAreaProps) => {
  const [mensagem, setMensagem] = useState("");
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversa } = useQuery({
    queryKey: ['whatsapp-conversa', conversaId],
    queryFn: async () => {
      if (!conversaId) return null;
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .select(`
          *,
          whatsapp_contatos (
            numero_whatsapp,
            nome_whatsapp,
            foto_perfil_url,
            contatos (
              nome_completo,
              primeiro_nome,
              email,
              celular
            )
          )
        `)
        .eq('id', conversaId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
  });

  const { data: mensagens } = useQuery({
    queryKey: ['whatsapp-mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
  });

  const enviarMensagemMutation = useMutation({
    mutationFn: async (corpo: string) => {
      if (!conversaId || !conversa) return;

      // Primeiro, criar a mensagem no banco como pendente
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversaId,
          whatsapp_conta_id: contaId,
          whatsapp_contato_id: conversa.whatsapp_contato_id,
          corpo,
          direcao: 'enviada',
          tipo_mensagem: 'texto',
          status: 'pendente',
          enviada_por_usuario_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Depois, chamar a edge function para enviar via Gupshup
      if (data) {
        const { error: functionError } = await supabase.functions.invoke('gupshup-enviar-mensagem', {
          body: { mensagemId: data.id }
        });

        if (functionError) {
          console.error('Erro ao chamar edge function:', functionError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      setMensagem("");
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem está sendo enviada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEnviar = () => {
    if (!mensagem.trim()) return;
    enviarMensagemMutation.mutate(mensagem);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  if (!conversaId) {
    return (
      <Card className="h-full flex items-center justify-center bg-card/30 backdrop-blur">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma conversa na lista para começar a atender
          </p>
        </div>
      </Card>
    );
  }

  const nomeContato = conversa?.whatsapp_contatos?.contatos?.nome_completo || 
                     conversa?.whatsapp_contatos?.nome_whatsapp ||
                     conversa?.whatsapp_contatos?.numero_whatsapp;
  const iniciais = nomeContato?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Card className="h-full min-h-0 flex flex-col bg-card/50 backdrop-blur border-muted">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-br from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-muted/20 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setDetalhesOpen(true)}
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={conversa?.whatsapp_contatos?.foto_perfil_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{nomeContato}</h2>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {conversa?.whatsapp_contatos?.numero_whatsapp}
                </p>
                {conversa?.janela_24h_ativa && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Janela 24h ativa
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet com detalhes do contato */}
      <Sheet open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Contato</SheetTitle>
            <SheetDescription>
              Informações completas e histórico do cliente
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Avatar e Nome */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={conversa?.whatsapp_contatos?.foto_perfil_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-2xl">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">
                {nomeContato}
              </h3>
              {conversa?.whatsapp_contatos?.nome_whatsapp && (
                <p className="text-sm text-muted-foreground">
                  @{conversa.whatsapp_contatos.nome_whatsapp}
                </p>
              )}
            </div>

            <Separator />

            {/* Informações de Contato */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Informações de Contato
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Telefone</p>
                    <p>{conversa?.whatsapp_contatos?.numero_whatsapp || '-'}</p>
                  </div>
                </div>

                {conversa?.whatsapp_contatos?.contatos?.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p>{conversa.whatsapp_contatos.contatos.email}</p>
                    </div>
                  </div>
                )}

                {conversa?.whatsapp_contatos?.contatos?.celular && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Celular</p>
                      <p>{conversa.whatsapp_contatos.contatos.celular}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Estatísticas da Conversa */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Estatísticas da Conversa
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total de Mensagens</p>
                  <p className="text-2xl font-bold">{conversa?.total_mensagens || 0}</p>
                </Card>
                
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={conversa?.status === 'aberta' ? 'default' : 'secondary'}>
                    {conversa?.status || '-'}
                  </Badge>
                </Card>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prioridade:</span>
                  <Badge variant={
                    conversa?.prioridade === 'alta' ? 'destructive' :
                    conversa?.prioridade === 'media' ? 'default' : 'secondary'
                  }>
                    {conversa?.prioridade || 'normal'}
                  </Badge>
                </div>

                {conversa?.ultima_mensagem_em && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última mensagem:</span>
                    <span>{format(new Date(conversa.ultima_mensagem_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                  </div>
                )}

                {conversa?.sentimento_cliente && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sentimento:</span>
                    <span className="flex items-center gap-1">
                      {conversa.emoji_sentimento && <span>{conversa.emoji_sentimento}</span>}
                      <span className="capitalize">{conversa.sentimento_cliente}</span>
                    </span>
                  </div>
                )}

                {conversa?.tags && conversa.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conversa.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  // Implementar navegação para detalhes do cliente se houver conta_id
                  if (conversa?.conta_id) {
                    window.location.href = `/clientes/${conversa.conta_id}`;
                  } else {
                    toast({
                      title: "Cliente não vinculado",
                      description: "Este contato ainda não está vinculado a um cliente.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Ver Detalhes do Cliente
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mensagens */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {mensagens?.map((msg) => {
            const isEnviada = msg.direcao === 'enviada';
            
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  isEnviada ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    isEnviada
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.corpo}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs opacity-70">
                      {format(new Date(msg.criado_em), 'HH:mm', { locale: ptBR })}
                    </span>
                    {isEnviada && (
                      <CheckCheck className={cn(
                        "w-4 h-4",
                        msg.status === 'lida' ? "text-blue-400" : "opacity-70"
                      )} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-gradient-to-br from-muted/20 to-transparent">
        {!conversa?.janela_24h_ativa && (
          <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Janela de 24h expirada. Você só pode enviar mensagens aprovadas pelo WhatsApp (templates).
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <Textarea
            placeholder="Digite sua mensagem..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[50px] max-h-[120px] resize-none bg-background/50"
            disabled={!conversa?.janela_24h_ativa}
          />
          
          <Button 
            onClick={handleEnviar}
            disabled={!mensagem.trim() || enviarMensagemMutation.isPending || !conversa?.janela_24h_ativa}
            className="bg-gradient-to-br from-primary to-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatArea;
