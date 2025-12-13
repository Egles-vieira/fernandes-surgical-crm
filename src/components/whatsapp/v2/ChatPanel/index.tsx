// ============================================
// Chat Panel Component
// ============================================

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Image as ImageIcon,
  FileText,
  Mic,
  PanelRightOpen,
  CheckCheck,
  Check,
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { whatsAppService } from '@/services/whatsapp';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Contato {
  id: string;
  nome_whatsapp: string;
  numero_whatsapp: string;
  foto_url?: string;
}

interface ChatPanelProps {
  conversaId: string | null;
  contato?: Contato;
  onToggleDetails: () => void;
  showDetailsButton: boolean;
}

interface Mensagem {
  id: string;
  corpo: string;
  tipo_mensagem: string;
  direcao: 'enviada' | 'recebida';
  status: string;
  criado_em: string;
  enviada_por_bot?: boolean;
  enviada_por_id?: string;
}

export function ChatPanel({ 
  conversaId, 
  contato, 
  onToggleDetails,
  showDetailsButton 
}: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch current user profile
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('perfis_usuario')
        .select('id, nome_completo')
        .eq('id', user.id)
        .single();
      
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch messages
  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ['whatsapp-mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .select('id, corpo, tipo_mensagem, direcao, status, criado_em, enviada_por_bot, enviada_por_usuario_id')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true })
        .limit(100);

      if (error) throw error;
      
      // Fetch user names for outgoing messages
      const userIds = [...new Set(data.filter(m => m.enviada_por_usuario_id).map(m => m.enviada_por_usuario_id))];
      let userMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('perfis_usuario')
          .select('id, nome_completo')
          .in('id', userIds);
        
        userMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.nome_completo || 'Operador';
          return acc;
        }, {} as Record<string, string>);
      }
      
      return data.map(m => ({
        ...m,
        operador_nome: m.enviada_por_usuario_id ? userMap[m.enviada_por_usuario_id] : undefined
      })) as (Mensagem & { operador_nome?: string })[];
    },
    enabled: !!conversaId,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!conversaId || !contato) throw new Error('Conversa não selecionada');
      
      // Get the whatsapp_conta_id from the conversation
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('whatsapp_conta_id')
        .eq('id', conversaId)
        .single();

      if (!conversa) throw new Error('Conversa não encontrada');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Use sendTextMessage which creates the message and sends it
      return whatsAppService.sendTextMessage(
        conversaId,
        texto,
        conversa.whatsapp_conta_id,
        contato.id,
        user.id
      );
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', conversaId] });
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

  // Realtime subscription
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', conversaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversaId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm">Escolha uma conversa para ver as mensagens</p>
        </div>
      </div>
    );
  }

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contato?.foto_url} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(contato?.nome_whatsapp || '??')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-sm">
              {contato?.nome_whatsapp || 'Desconhecido'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {contato?.numero_whatsapp}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          {showDetailsButton && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleDetails}>
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Fechar conversa</DropdownMenuItem>
              <DropdownMenuItem>Transferir</DropdownMenuItem>
              <DropdownMenuItem>Bloquear contato</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                <Skeleton className="h-16 w-64 rounded-lg" />
              </div>
            ))}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mensagens.map((msg, index) => {
              // Show sender if first message or different direction from previous
              const prevMsg = mensagens[index - 1];
              const showSender = !prevMsg || prevMsg.direcao !== msg.direcao;
              
              return (
                <MessageBubble 
                  key={msg.id} 
                  mensagem={msg} 
                  contato={contato}
                  showSender={showSender}
                  operadorNome={msg.operador_nome || currentUserProfile?.nome_completo}
                />
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <ImageIcon className="h-4 w-4 mr-2" />
                Imagem
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Smile className="h-4 w-4" />
          </Button>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[36px] max-h-32 resize-none"
            rows={1}
          />

          {message.trim() ? (
            <Button 
              size="icon" 
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  mensagem: Mensagem;
  contato?: Contato;
  showSender?: boolean;
  operadorNome?: string;
}

function MessageBubble({ mensagem, contato, showSender = true, operadorNome }: MessageBubbleProps) {
  const isOutgoing = mensagem.direcao === 'enviada';

  const getStatusIcon = () => {
    switch (mensagem.status) {
      case 'lida':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      case 'entregue':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'enviada':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'pendente':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
      default:
        return null;
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const senderName = isOutgoing 
    ? (operadorNome || 'Operador') 
    : (contato?.nome_whatsapp || 'Cliente');
  const formattedTime = format(new Date(mensagem.criado_em), 'HH:mm', { locale: ptBR });

  return (
    <div className={cn(
      "flex gap-3 group",
      isOutgoing ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-1 ring-2 ring-background shadow-sm">
        {isOutgoing ? (
          <>
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-medium">
              Eu
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src={contato?.foto_url} />
            <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium">
              {getInitials(contato?.nome_whatsapp || 'CL')}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[70%]",
        isOutgoing ? "items-end" : "items-start"
      )}>
        {/* Sender Name & Time */}
        {showSender && (
          <div className={cn(
            "flex items-center gap-2 mb-1 text-xs",
            isOutgoing ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="font-medium text-foreground">{senderName}</span>
            <span className="text-muted-foreground">{formattedTime}</span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "relative px-4 py-2.5 rounded-2xl shadow-md transition-all",
            isOutgoing 
              ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-tr-md" 
              : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-md border border-slate-200 dark:border-slate-600"
          )}
        >
          {mensagem.enviada_por_bot && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] mb-1.5 px-1.5 py-0 font-normal",
                isOutgoing ? "bg-primary-foreground/20 text-primary-foreground" : ""
              )}
            >
              🤖 Bot
            </Badge>
          )}
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {mensagem.corpo}
          </p>
          
          {/* Status indicator for outgoing */}
          {isOutgoing && (
            <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5">
              {getStatusIcon()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
