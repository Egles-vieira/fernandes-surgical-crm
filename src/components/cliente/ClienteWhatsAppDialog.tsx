import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, MessageCircle, Plus, Send, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface ClienteWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: {
    id: string;
    nome_completo: string;
    celular: string;
    cliente_id?: string;
  } | null;
}

const ClienteWhatsAppDialog = ({ open, onOpenChange, contato }: ClienteWhatsAppDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { contas, isLoadingContas, useMensagens, enviarMensagem } = useWhatsApp();
  const [selectedConta, setSelectedConta] = useState<string | null>(null);
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [mensagemTexto, setMensagemTexto] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Buscar contato WhatsApp e conversas existentes
  const { data: whatsappData, isLoading: isLoadingWhatsapp } = useQuery({
    queryKey: ['whatsapp-contato-conversas', contato?.celular],
    queryFn: async () => {
      if (!contato?.celular) return null;

      // Formatar número
      const numeroFormatado = contato.celular.replace(/\D/g, '');
      const numeroCompleto = numeroFormatado.startsWith('55') 
        ? `+${numeroFormatado}` 
        : `+55${numeroFormatado}`;

      // Buscar contato WhatsApp
      const { data: whatsappContato } = await supabase
        .from('whatsapp_contatos')
        .select('id, whatsapp_conta_id')
        .eq('numero_whatsapp', numeroCompleto)
        .maybeSingle();

      if (!whatsappContato) return { contato: null, conversas: [] };

      // Buscar conversas ativas
      const { data: conversas } = await supabase
        .from('whatsapp_conversas')
        .select(`
          id,
          titulo,
          status,
          ultima_mensagem_em,
          whatsapp_conta_id,
          whatsapp_contas (nome_conta)
        `)
        .eq('whatsapp_contato_id', whatsappContato.id)
        .neq('status', 'fechada')
        .order('ultima_mensagem_em', { ascending: false });

      return { contato: whatsappContato, conversas: conversas || [] };
    },
    enabled: !!contato?.celular && open,
  });

  // Buscar mensagens da conversa selecionada
  const { data: mensagens, isLoading: isLoadingMensagens } = useMensagens(conversaSelecionada || undefined);

  // Scroll automático para última mensagem
  useEffect(() => {
    if (mensagens && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  // Real-time updates para mensagens
  useEffect(() => {
    if (!conversaSelecionada) return;

    const channel = supabase
      .channel('whatsapp-mensagens-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `conversa_id=eq.${conversaSelecionada}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', conversaSelecionada] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaSelecionada, queryClient]);

  // Selecionar primeira conta ativa automaticamente
  useEffect(() => {
    if (contas && contas.length > 0 && !selectedConta) {
      setSelectedConta(contas[0].id);
    }
  }, [contas, selectedConta]);

  const criarConversaMutation = useMutation({
    mutationFn: async () => {
      if (!contato || !selectedConta) throw new Error("Dados inválidos");

      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const numeroFormatado = contato.celular.replace(/\D/g, '');
      const numeroCompleto = numeroFormatado.startsWith('55') 
        ? `+${numeroFormatado}` 
        : `+55${numeroFormatado}`;

      let whatsappContatoId: string;

      // Verificar/criar contato WhatsApp
      if (whatsappData?.contato) {
        whatsappContatoId = whatsappData.contato.id;
      } else {
        // Criar contato WhatsApp vinculado ao contato existente
        const { data: novoContatoWhatsApp, error: contatoWhatsAppError } = await supabase
          .from('whatsapp_contatos')
          .insert({
            contato_id: contato.id,
            numero_whatsapp: numeroCompleto,
            nome_whatsapp: contato.nome_completo,
            whatsapp_conta_id: selectedConta,
          })
          .select('id')
          .single();

        if (contatoWhatsAppError) throw contatoWhatsAppError;
        whatsappContatoId = novoContatoWhatsApp.id;
      }

      // Criar nova conversa
      const { data: novaConversa, error: conversaError } = await supabase
        .from('whatsapp_conversas')
        .insert({
          whatsapp_conta_id: selectedConta,
          whatsapp_contato_id: whatsappContatoId,
          contato_id: contato.id,
          titulo: `${contato.nome_completo}`,
          status: 'aberta',
          atribuida_para_id: user.data.user.id,
        })
        .select('id')
        .single();

      if (conversaError) throw conversaError;
      return novaConversa.id;
    },
    onSuccess: (conversaId) => {
      toast({
        title: "Conversa criada",
        description: "Abrindo conversa...",
      });
      setConversaSelecionada(conversaId);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAbrirConversa = (conversaId: string) => {
    setConversaSelecionada(conversaId);
  };

  const handleVoltarLista = () => {
    setConversaSelecionada(null);
    setMensagemTexto("");
  };

  const handleNovaConversa = () => {
    criarConversaMutation.mutate();
  };

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagemTexto.trim() || !conversaSelecionada || !selectedConta) return;

    const conversaAtual = whatsappData?.conversas.find((c: any) => c.id === conversaSelecionada);
    if (!conversaAtual) return;

    try {
      await enviarMensagem.mutateAsync({
        conversaId: conversaSelecionada,
        contaId: selectedConta,
        contatoId: whatsappData?.contato?.id || "",
        corpo: mensagemTexto,
      });
      setMensagemTexto("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const formatarHora = (data: string) => {
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!contato) return null;

  const isLoading = isLoadingContas || isLoadingWhatsapp;
  const temConversas = whatsappData?.conversas && whatsappData.conversas.length > 0;

  const conversaAtual = whatsappData?.conversas.find((c: any) => c.id === conversaSelecionada);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {conversaSelecionada && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoltarLista}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <MessageSquare className="w-5 h-5" />
              {conversaSelecionada ? conversaAtual?.titulo : `WhatsApp - ${contato.nome_completo}`}
            </SheetTitle>
            <SheetDescription>
              {conversaSelecionada 
                ? `Conversa com ${contato.nome_completo}`
                : temConversas 
                  ? "Conversas existentes ou inicie uma nova" 
                  : "Iniciar conversa no WhatsApp"}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {conversaSelecionada ? (
            /* ÁREA DE CHAT */
            <div className="h-full flex flex-col">
              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {isLoadingMensagens ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !mensagens || mensagens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mensagens.map((msg: any) => {
                      const isEnviada = msg.direcao === 'enviada';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isEnviada ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isEnviada
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.corpo}
                            </p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              isEnviada ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              <span>{formatarHora(msg.criado_em)}</span>
                              {isEnviada && (
                                <>
                                  {msg.status === 'entregue' && <CheckCheck className="w-3 h-3" />}
                                  {msg.status === 'lida' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                                  {msg.status === 'enviada' && <Check className="w-3 h-3" />}
                                  {msg.status === 'pendente' && <Loader2 className="w-3 h-3 animate-spin" />}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de mensagem */}
              <div className="p-4 border-t">
                <form onSubmit={handleEnviarMensagem} className="flex gap-2">
                  <Input
                    value={mensagemTexto}
                    onChange={(e) => setMensagemTexto(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={enviarMensagem.isPending}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!mensagemTexto.trim() || enviarMensagem.isPending}
                    size="icon"
                  >
                    {enviarMensagem.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            /* LISTA DE CONVERSAS */
            isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
              {/* Conversas Existentes */}
              {temConversas && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Conversas Ativas</h4>
                  <div className="space-y-2">
                    {whatsappData.conversas.map((conversa: any) => (
                      <button
                        key={conversa.id}
                        onClick={() => handleAbrirConversa(conversa.id)}
                        className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate mb-1">
                              {conversa.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {conversa.whatsapp_contas?.nome_conta}
                            </p>
                            {conversa.ultima_mensagem_em && (
                              <p className="text-xs text-muted-foreground">
                                Última msg: {new Date(conversa.ultima_mensagem_em).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {conversa.status}
                            </Badge>
                            <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nova Conversa */}
              <div className="space-y-4">
                {temConversas && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    {temConversas ? "Iniciar Nova Conversa" : "Criar Conversa"}
                  </h4>

                  {!contas || contas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma conta WhatsApp configurada</p>
                      <p className="text-xs mt-1">Configure uma conta em Configurações</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Info Card */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span className="font-medium">Informações do Contato</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground pl-6">
                          <p><strong>Nome:</strong> {contato.nome_completo}</p>
                          <p><strong>Número:</strong> {contato.celular}</p>
                          {contas && contas.length > 0 && (
                            <p><strong>Conta WhatsApp:</strong> {contas.find(c => c.id === selectedConta)?.nome_conta}</p>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onOpenChange(false)}
                          className="flex-1"
                        >
                          Fechar
                        </Button>
                        <Button
                          onClick={handleNovaConversa}
                          disabled={criarConversaMutation.isPending}
                          className="flex-1"
                        >
                          {criarConversaMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Nova Conversa
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClienteWhatsAppDialog;
