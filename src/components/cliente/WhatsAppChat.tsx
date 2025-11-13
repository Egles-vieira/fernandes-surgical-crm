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
  const setupExecutedRef = useRef(false);
  
  const [message, setMessage] = useState("");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [whatsappContatoId, setWhatsappContatoId] = useState<string | null>(null);
  const [contaId, setContaId] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [isLoadingMensagens, setIsLoadingMensagens] = useState(false);
  const [sentimento, setSentimento] = useState<{
    sentimento: string;
    emoji: string;
    confianca?: number;
  } | null>(null);
  const [analisandoSentimento, setAnalisandoSentimento] = useState(false);

  // Setup inicial: buscar/criar contato e conversa WhatsApp
  useEffect(() => {
    if (!open || !phoneNumber) return;

    // Prevenir execução dupla (React StrictMode em dev)
    if (setupExecutedRef.current) {
      console.log('⚠️ Setup já executado, ignorando execução duplicada');
      return;
    }

    const setupWhatsApp = async () => {
      setupExecutedRef.current = true;
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

        // Função para normalizar número (com e sem +)
        const normalizarNumero = (num: string) => {
          const semFormato = num.replace(/\D/g, '');
          const numeroBase = semFormato.startsWith('55') ? semFormato : `55${semFormato}`;
          return {
            comMais: `+${numeroBase}`,
            semMais: numeroBase
          };
        };

        const { comMais, semMais } = normalizarNumero(phoneNumber);
        console.log('Números normalizados:', { comMais, semMais });

        // Buscar contato WhatsApp existente por número (ambas formatações)
        let whatsappContatos: { id: string; contato_id?: string | null; numero_whatsapp: string }[] = [];

        const { data: contatosPorNumero, error: errByNumero } = await supabase
          .from('whatsapp_contatos')
          .select('id, contato_id, numero_whatsapp')
          .eq('whatsapp_conta_id', contaAtiva.id)
          .or(`numero_whatsapp.eq.${comMais},numero_whatsapp.eq.${semMais}`);

        if (errByNumero) {
          console.error('Erro ao buscar por número:', errByNumero);
          throw errByNumero;
        }

        if (contatosPorNumero && contatosPorNumero.length > 0) {
          whatsappContatos = contatosPorNumero;
          
          // Alertar sobre duplicados
          if (contatosPorNumero.length > 1) {
            console.warn('⚠️ Múltiplos contatos WhatsApp encontrados para o mesmo número:', contatosPorNumero);
          }
        }

        // Se não achou por número mas temos contactId, tentar por contato_id
        if (whatsappContatos.length === 0 && contactId) {
          const { data: byContato, error: errByContato } = await supabase
            .from('whatsapp_contatos')
            .select('id, contato_id, numero_whatsapp')
            .eq('contato_id', contactId)
            .eq('whatsapp_conta_id', contaAtiva.id)
            .maybeSingle();

          if (errByContato) {
            console.error('Erro ao buscar por contato_id:', errByContato);
            throw errByContato;
          }
          
          if (byContato) {
            whatsappContatos = [byContato];
          }
        }

        // Usar primeiro contato encontrado
        let whatsappContato = whatsappContatos[0] || null;

        // Se achou por número mas ainda não está vinculado ao contato CRM, vincular
        if (whatsappContato && contactId && !whatsappContato.contato_id) {
          console.log('Vinculando contato WhatsApp ao CRM...');
          await supabase
            .from('whatsapp_contatos')
            .update({ contato_id: contactId })
            .eq('id', whatsappContato.id);
          whatsappContato.contato_id = contactId;
        }

        console.log('Contato WhatsApp localizado:', whatsappContato);

        // Se não existe e temos o contactId, criar
        if (!whatsappContato && contactId) {
          console.log('Criando novo contato WhatsApp...');
          
          const { data: novoContato, error: erroContato } = await supabase
            .from('whatsapp_contatos')
            .insert({
              contato_id: contactId,
              numero_whatsapp: comMais, // Usar número com +
              nome_whatsapp: contactName,
              whatsapp_conta_id: contaAtiva.id,
            })
            .select('id, contato_id, numero_whatsapp')
            .single();

          if (erroContato) {
            // Se der erro de duplicação, buscar o contato existente por contato_id+conta
            if (erroContato.code === '23505') {
              console.log('Contato já existe (unique contato_id+conta). Buscando...');
              const { data: contatoExistente } = await supabase
                .from('whatsapp_contatos')
                .select('id, contato_id, numero_whatsapp')
                .eq('contato_id', contactId)
                .eq('whatsapp_conta_id', contaAtiva.id)
                .maybeSingle();
              if (contatoExistente) {
                whatsappContato = contatoExistente;
                whatsappContatos = [contatoExistente];
              }
            } else {
              throw erroContato;
            }
          } else {
            whatsappContato = novoContato;
            whatsappContatos = [novoContato];
          }
        }

        // Se ainda não tem contato, tentar buscar apenas por número (qualquer conta)
        if (!whatsappContato) {
          console.log('Buscando contato apenas por número (qualquer conta)...');
          const { data: contatoPorNumero } = await supabase
            .from('whatsapp_contatos')
            .select('id, contato_id, numero_whatsapp')
            .or(`numero_whatsapp.eq.${comMais},numero_whatsapp.eq.${semMais}`)
            .limit(1)
            .maybeSingle();
          
          if (contatoPorNumero) {
            whatsappContato = contatoPorNumero;
            whatsappContatos = [contatoPorNumero];
          }
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

        // Buscar conversa existente priorizando janela 24h ativa
        // Buscar em TODOS os contatos encontrados (caso haja duplicados)
        let conversa: { id: string } | null = null;
        const todosContatosIds = whatsappContatos.map(c => c.id);

        console.log('Buscando conversas para contatos:', todosContatosIds);

        // 1) Priorizar conversas com janela 24h ativa
        const { data: conversasAtivas, error: erroConsultaAtiva } = await supabase
          .from('whatsapp_conversas')
          .select('id, janela_24h_ativa, status, criado_em')
          .eq('whatsapp_conta_id', contaAtiva.id)
          .in('whatsapp_contato_id', todosContatosIds)
          .eq('janela_24h_ativa', true)
          .neq('status', 'fechada')
          .order('janela_aberta_em', { ascending: false })
          .limit(1);

        if (erroConsultaAtiva) {
          console.error('Erro ao buscar conversa ativa (24h):', erroConsultaAtiva);
          throw erroConsultaAtiva;
        }

        if (conversasAtivas && conversasAtivas.length > 0) {
          conversa = conversasAtivas[0];
          console.log('✅ Conversa com janela 24h ativa encontrada:', conversa.id);
        } else {
          // 2) Buscar conversa mais recente não fechada (qualquer status)
          const { data: conversasRecentes, error: erroConsultaRecente } = await supabase
            .from('whatsapp_conversas')
            .select('id, janela_24h_ativa, status, criado_em')
            .eq('whatsapp_conta_id', contaAtiva.id)
            .in('whatsapp_contato_id', todosContatosIds)
            .neq('status', 'fechada')
            .order('criado_em', { ascending: false })
            .limit(1);

          if (erroConsultaRecente) {
            console.error('Erro ao buscar conversa recente:', erroConsultaRecente);
            throw erroConsultaRecente;
          }

          if (conversasRecentes && conversasRecentes.length > 0) {
            conversa = conversasRecentes[0];
            console.log('📝 Conversa existente encontrada (sem janela 24h):', conversa.id);
          } else {
            console.log('❌ Nenhuma conversa existente encontrada');
          }
        }

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

    // Cleanup: resetar flag quando componente desmontar
    return () => {
      console.log('🧹 Limpando setup WhatsApp');
      setupExecutedRef.current = false;
    };
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

  // Análise de sentimento
  const analisarSentimento = async (idConversa: string) => {
    if (analisandoSentimento) {
      console.log('⏳ Análise já em andamento, aguarde...');
      return;
    }
    
    console.log('🔍 Iniciando análise de sentimento para conversa:', idConversa);
    setAnalisandoSentimento(true);
    
    try {
      console.log('📡 Chamando edge function analisar-sentimento-cliente...');
      const { data, error } = await supabase.functions.invoke('analisar-sentimento-cliente', {
        body: { conversaId: idConversa }
      });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Sentimento analisado:', data);
        setSentimento(data);
      } else {
        console.log('⚠️ Nenhum dado retornado da análise');
      }
    } catch (error: any) {
      console.error('❌ Erro ao analisar sentimento:', error);
      toast({
        title: "Erro na análise",
        description: error.message || "Não foi possível analisar o sentimento",
        variant: "destructive",
      });
    } finally {
      setAnalisandoSentimento(false);
      console.log('🏁 Análise de sentimento finalizada');
    }
  };

  // Real-time: escutar novas mensagens e atualização de sentimento
  useEffect(() => {
    if (!conversaId) {
      console.log('⚠️ useEffect: conversaId não definido, pulando análise');
      return;
    }

    console.log('🎯 useEffect: Configurando realtime para conversa:', conversaId);

    const channel = supabase
      .channel(`whatsapp-conversas-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          console.log('📨 Nova mensagem recebida via realtime:', payload.new);
          setMensagens((prev) => [...prev, payload.new]);
          
          // Se é mensagem recebida, analisar sentimento após 3 segundos (debounce)
          if (payload.new.direcao === 'recebida') {
            console.log('⏰ Agendando análise de sentimento em 3 segundos...');
            setTimeout(() => {
              analisarSentimento(conversaId);
            }, 3000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversas',
          filter: `id=eq.${conversaId}`,
        },
        (payload) => {
          console.log('🔄 Conversa atualizada via realtime:', payload.new);
          // Atualizar sentimento local quando atualizado no banco
          if (payload.new.sentimento_cliente) {
            console.log('💭 Atualizando sentimento local:', payload.new.sentimento_cliente);
            setSentimento({
              sentimento: payload.new.sentimento_cliente,
              emoji: payload.new.emoji_sentimento,
            });
          }
        }
      )
      .subscribe();

    // Análise inicial do sentimento
    console.log('🚀 Disparando análise inicial de sentimento...');
    analisarSentimento(conversaId);

    return () => {
      console.log('🧹 Limpando canal realtime');
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
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-primary-foreground text-base font-medium truncate">
                    {contactName}
                  </SheetTitle>
                  {sentimento && (
                    <span 
                      className="text-2xl" 
                      title={`Cliente está ${sentimento.sentimento}${sentimento.confianca ? ` (${Math.round(sentimento.confianca * 100)}% confiança)` : ''}`}
                    >
                      {sentimento.emoji}
                    </span>
                  )}
                  {analisandoSentimento && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground/60" />
                  )}
                </div>
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
