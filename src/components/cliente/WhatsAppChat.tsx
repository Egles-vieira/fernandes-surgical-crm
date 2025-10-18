import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WhatsAppChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactInitials: string;
  phoneNumber?: string;
  contactId?: string;
}

export default function WhatsAppChat({
  open,
  onOpenChange,
  contactName,
  contactInitials,
  phoneNumber,
  contactId
}: WhatsAppChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { contas, enviarMensagem } = useWhatsApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState("");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [whatsappContatoId, setWhatsappContatoId] = useState<string | null>(null);
  const [contaId, setContaId] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [isLoadingMensagens, setIsLoadingMensagens] = useState(false);

  // Setup inicial: buscar/criar contato e conversa WhatsApp
  useEffect(() => {
    if (!open || !phoneNumber) return;

    const setupWhatsApp = async () => {
      setIsLoadingSetup(true);
      try {
        // Selecionar primeira conta ativa
        if (!contas || contas.length === 0) {
          toast({
            title: "Nenhuma conta WhatsApp",
            description: "Configure uma conta WhatsApp nas configurações",
            variant: "destructive",
          });
          setIsLoadingSetup(false);
          return;
        }

        const contaAtiva = contas[0];
        setContaId(contaAtiva.id);
        console.log('Conta WhatsApp ativa:', contaAtiva);

        // Formatar número
        const numeroFormatado = phoneNumber.replace(/\D/g, '');
        const numeroCompleto = numeroFormatado.startsWith('55') 
          ? `+${numeroFormatado}` 
          : `+55${numeroFormatado}`;

        console.log('Número formatado:', numeroCompleto);

        // Buscar contato WhatsApp existente (1) por contato_id + conta; (2) por número + conta
        let whatsappContato: { id: string } | null = null;

        if (contactId) {
          const { data: byContato, error: errByContato } = await supabase
            .from('whatsapp_contatos')
            .select('id, numero_whatsapp')
            .eq('contato_id', contactId)
            .eq('whatsapp_conta_id', contaAtiva.id)
            .maybeSingle();
          if (errByContato) {
            console.error('Erro ao buscar por contato_id:', errByContato);
            throw errByContato;
          }
          if (byContato) whatsappContato = { id: byContato.id };
        }

        if (!whatsappContato) {
          const { data: byNumero, error: errByNumero } = await supabase
            .from('whatsapp_contatos')
            .select('id')
            .eq('numero_whatsapp', numeroCompleto)
            .eq('whatsapp_conta_id', contaAtiva.id)
            .maybeSingle();
          if (errByNumero) {
            console.error('Erro ao buscar por número:', errByNumero);
            throw errByNumero;
          }
          if (byNumero) whatsappContato = byNumero;
        }

        console.log('Contato WhatsApp encontrado:', whatsappContato);

        // Se não existe e temos o contactId, criar
        if (!whatsappContato && contactId) {
          console.log('Criando novo contato WhatsApp...');
          
          const { data: novoContato, error: erroContato } = await supabase
            .from('whatsapp_contatos')
            .insert({
              contato_id: contactId,
              numero_whatsapp: numeroCompleto,
              nome_whatsapp: contactName,
              whatsapp_conta_id: contaAtiva.id,
            })
            .select('id')
            .single();

          if (erroContato) {
            // Se der erro de duplicação, buscar o contato existente por contato_id+conta
            if (erroContato.code === '23505') {
              console.log('Contato já existe (unique contato_id+conta). Buscando...');
              const { data: contatoExistente } = await supabase
                .from('whatsapp_contatos')
                .select('id')
                .eq('contato_id', contactId)
                .eq('whatsapp_conta_id', contaAtiva.id)
                .maybeSingle();
              whatsappContato = contatoExistente ?? null;
            } else {
              throw erroContato;
            }
          } else {
            whatsappContato = novoContato;
          }
        }

        // Se ainda não tem contato, tentar buscar apenas por número (sem filtrar conta)
        if (!whatsappContato) {
          console.log('Buscando contato apenas por número...');
          const { data: contatoPorNumero } = await supabase
            .from('whatsapp_contatos')
            .select('id')
            .eq('numero_whatsapp', numeroCompleto)
            .maybeSingle();
          
          whatsappContato = contatoPorNumero ?? null;
        }

        if (!whatsappContato) {
          toast({
            title: "Contato não encontrado",
            description: "Não foi possível localizar ou criar o contato WhatsApp",
            variant: "destructive",
          });
          setIsLoadingSetup(false);
          return;
        }

        console.log('Usando contato WhatsApp ID:', whatsappContato.id);
        setWhatsappContatoId(whatsappContato.id);

        // Buscar conversa existente
        let { data: conversa, error: erroConsultaConversa } = await supabase
          .from('whatsapp_conversas')
          .select('id')
          .eq('whatsapp_contato_id', whatsappContato.id)
          .eq('whatsapp_conta_id', contaAtiva.id)
          .neq('status', 'fechada')
          .order('criado_em', { ascending: false })
          .maybeSingle();

        if (erroConsultaConversa) {
          console.error('Erro ao buscar conversa:', erroConsultaConversa);
          throw erroConsultaConversa;
        }

        console.log('Conversa encontrada:', conversa);

        // Se não existe conversa, criar uma nova
        if (!conversa) {
          console.log('Criando nova conversa...');
          const user = await supabase.auth.getUser();
          
          const { data: novaConversa, error: erroConversa } = await supabase
            .from('whatsapp_conversas')
            .insert({
              whatsapp_conta_id: contaAtiva.id,
              whatsapp_contato_id: whatsappContato.id,
              contato_id: contactId,
              titulo: contactName,
              status: 'aberta',
              atribuida_para_id: user.data.user?.id,
            })
            .select('id')
            .single();

          if (erroConversa) {
            console.error('Erro ao criar conversa:', erroConversa);
            throw erroConversa;
          }
          
          conversa = novaConversa;
          console.log('Nova conversa criada:', conversa);
        }

        setConversaId(conversa.id);
        
        // Buscar mensagens
        console.log('Buscando mensagens da conversa:', conversa.id);
        await buscarMensagens(conversa.id);
        
      } catch (error: any) {
        console.error('Erro ao configurar WhatsApp:', error);
        toast({
          title: "Erro ao configurar WhatsApp",
          description: error.message || "Erro desconhecido",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSetup(false);
      }
    };

    setupWhatsApp();
  }, [open, phoneNumber, contactId, contactName, contas]);

  // Buscar mensagens
  const buscarMensagens = async (idConversa: string) => {
    setIsLoadingMensagens(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('conversa_id', idConversa)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      setMensagens(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setIsLoadingMensagens(false);
    }
  };

  // Real-time: escutar novas mensagens
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`whatsapp-mensagens-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          setMensagens((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversaId || !contaId || !whatsappContatoId) return;

    try {
      await enviarMensagem.mutateAsync({
        conversaId,
        contaId,
        contatoId: whatsappContatoId,
        corpo: message,
      });

      setMessage("");
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatarHora = (data: string) => {
    return new Date(data).toLocaleTimeString("pt-BR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const getStatusIcon = (status: string, direcao: string) => {
    if (direcao !== 'enviada') return null;
    
    switch (status) {
      case 'lida':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'entregue':
        return <CheckCheck className="h-3 w-3" />;
      case 'enviada':
        return <Check className="h-3 w-3" />;
      default:
        return <Loader2 className="h-3 w-3 animate-spin" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] lg:w-[700px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="gradient-primary p-4 space-y-0 shadow-elegant">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary-foreground text-primary">
                  {contactInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-primary-foreground text-base font-medium truncate">
                  {contactName}
                </SheetTitle>
                {phoneNumber && (
                  <p className="text-xs text-primary-foreground/80 truncate">
                    {phoneNumber}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 gradient-subtle">
          {isLoadingSetup || isLoadingMensagens ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !conversaId ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Não foi possível iniciar a conversa
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {mensagens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mensagem ainda. Inicie a conversa!
                  </p>
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direcao === 'enviada' ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 transition-all ${
                        msg.direcao === 'enviada'
                          ? "gradient-primary text-primary-foreground shadow-elegant"
                          : "bg-card border-border shadow-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.corpo}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-xs ${msg.direcao === 'enviada' ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatarHora(msg.criado_em)}
                        </span>
                        {msg.direcao === 'enviada' && (
                          <span className="text-primary-foreground/70">
                            {getStatusIcon(msg.status, msg.direcao)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4 shadow-elegant">
          {!conversaId ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configure uma conta WhatsApp para enviar mensagens
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-end gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0 hover:bg-muted"
                disabled
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite uma mensagem"
                  className="resize-none min-h-[40px]"
                  disabled={enviarMensagem.isPending}
                />
              </div>
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!message.trim() || enviarMensagem.isPending}
                className="h-10 w-10 shrink-0 gradient-primary shadow-elegant hover:opacity-90 transition-opacity"
              >
                {enviarMensagem.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
