import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Send, 
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClienteWhatsAppMessagesProps {
  contactName: string;
  phoneNumber?: string;
  contactId?: string;
}

export default function ClienteWhatsAppMessages({
  contactName,
  phoneNumber,
  contactId
}: ClienteWhatsAppMessagesProps) {
  const { toast } = useToast();
  const { contas, enviarMensagem } = useWhatsApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const setupExecutedRef = useRef(false);
  const setupMutexRef = useRef(false);
  
  const [message, setMessage] = useState("");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [whatsappContatoId, setWhatsappContatoId] = useState<string | null>(null);
  const [contaId, setContaId] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [isLoadingMensagens, setIsLoadingMensagens] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Setup inicial: buscar/criar contato e conversa WhatsApp
  useEffect(() => {
    if (!phoneNumber) {
      setIsLoadingSetup(false);
      return;
    }

    if (setupExecutedRef.current) {
      console.log('⚠️ Setup já executado, ignorando execução duplicada');
      return;
    }

    const setupWhatsApp = async () => {
      setupExecutedRef.current = true;
      
      if (setupMutexRef.current) {
        console.log('⏳ Setup em execução, aguardando...');
        return;
      }
      
      setupMutexRef.current = true;
      setIsLoadingSetup(true);
      
      try {
        // Selecionar primeira conta ativa
        if (!contas || contas.length === 0) {
          console.warn('Nenhuma conta WhatsApp configurada');
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
          
          if (contatosPorNumero.length > 1) {
            console.warn('⚠️ Múltiplos contatos WhatsApp encontrados:', contatosPorNumero);
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

        let whatsappContato = whatsappContatos[0] || null;

        // Vincular ao CRM se necessário
        if (whatsappContato && contactId && !whatsappContato.contato_id) {
          console.log('Vinculando contato WhatsApp ao CRM...');
          await supabase
            .from('whatsapp_contatos')
            .update({ contato_id: contactId })
            .eq('id', whatsappContato.id);
          whatsappContato.contato_id = contactId;
        }

        // Criar contato se não existir
        if (!whatsappContato && contactId) {
          console.log('Criando novo contato WhatsApp...');
          
          const { data: novoContato, error: erroContato } = await supabase
            .from('whatsapp_contatos')
            .insert({
              contato_id: contactId,
              numero_whatsapp: comMais,
              nome_whatsapp: contactName,
              whatsapp_conta_id: contaAtiva.id,
            })
            .select('id, contato_id, numero_whatsapp')
            .single();

          if (erroContato) {
            if (erroContato.code === '23505') {
              console.log('Contato já existe. Buscando...');
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

        // Buscar por número se ainda não tem contato
        if (!whatsappContato) {
          console.log('Buscando contato por número (qualquer conta)...');
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
          console.warn('Contato WhatsApp não encontrado');
          setIsLoadingSetup(false);
          return;
        }

        console.log('Usando contato WhatsApp ID:', whatsappContato.id);
        setWhatsappContatoId(whatsappContato.id);

        // Buscar conversa existente priorizando janela 24h ativa
        let conversa: { id: string } | null = null;
        const todosContatosIds = whatsappContatos.map(c => c.id);

        console.log('Buscando conversas para contatos:', todosContatosIds);

        // Priorizar conversas com janela 24h ativa
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
          console.error('Erro ao buscar conversa ativa:', erroConsultaAtiva);
          throw erroConsultaAtiva;
        }

        if (conversasAtivas && conversasAtivas.length > 0) {
          conversa = conversasAtivas[0];
          console.log('✅ Conversa com janela 24h ativa encontrada:', conversa.id);
        } else {
          // Buscar conversa mais recente não fechada
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
            console.log('📝 Conversa existente encontrada:', conversa.id);
          }
        }

        // Criar nova conversa se não existir
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
        setupMutexRef.current = false;
      }
    };

    setupWhatsApp();

    return () => {
      setupExecutedRef.current = false;
      setupMutexRef.current = false;
    };
  }, [phoneNumber, contactId, contactName, contas]);

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
      .channel(`whatsapp-messages-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          console.log('📨 Nova mensagem recebida:', payload.new);
          setMensagens((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite uma mensagem antes de enviar",
        variant: "destructive",
      });
      return;
    }

    if (!conversaId || !contaId || !whatsappContatoId) {
      toast({
        title: "Erro",
        description: "Conversa não está configurada",
        variant: "destructive",
      });
      return;
    }

    if (isSendingMessage) return;

    setIsSendingMessage(true);
    
    try {
      await enviarMensagem.mutateAsync({
        conversaId,
        contaId,
        contatoId: whatsappContatoId,
        corpo: message,
      });

      setMessage("");
      
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
      
    } catch (error: any) {
      console.error('❌ Erro ao enviar:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
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

  if (!phoneNumber) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Este contato não possui número de WhatsApp cadastrado
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingSetup) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {isLoadingMensagens ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !conversaId ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Não foi possível iniciar a conversa
            </p>
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Inicie a conversa!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direcao === 'enviada' ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.direcao === 'enviada'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
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
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <CardContent className="border-t p-4">
        {!conversaId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure uma conta WhatsApp para enviar mensagens
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-end gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite uma mensagem"
              disabled={isSendingMessage}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim() || isSendingMessage}
              className="shrink-0"
            >
              {isSendingMessage ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
