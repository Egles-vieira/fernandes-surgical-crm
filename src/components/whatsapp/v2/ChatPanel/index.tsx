// ============================================
// Chat Panel Component - Fase 4: Mensagens Avançadas
// Suporte a Reply, Reactions, Mark as Read, Media, Audio
// + Controle de Janela 24h e Templates
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Paperclip, Phone, Video, MoreVertical, Image as ImageIcon, FileText, Mic, PanelRightOpen, CheckCheck, Check, Clock, Reply, CornerDownLeft, X, Download, UserPlus, AlertCircle, Play, Bot, MessageSquareText, ShoppingCart, MessageCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateDivider } from './DateDivider';
import { whatsAppService } from '@/services/whatsapp';
import { toast } from 'sonner';
import { z } from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReplyPreview } from './ReplyPreview';
import { MessageReactions } from './MessageReactions';
import { EmojiPicker } from '@/components/whatsapp/EmojiPicker';
import MediaUploader from '@/components/whatsapp/MediaUploader';
import AudioRecorder from '@/components/whatsapp/AudioRecorder';
import { useWhatsAppDistribuicao } from '@/hooks/useWhatsAppDistribuicao';
import { useJanela24h } from '@/hooks/whatsapp/useJanela24h';
import { JanelaStatusBadge } from './JanelaStatusBadge';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { CartPanel } from './CartPanel';
import { TransferirConversaDialog } from './TransferirConversaDialog';
interface Contato {
  id: string;
  nome_whatsapp: string;
  numero_whatsapp: string;
  foto_url?: string;
}
interface ConversaInfo {
  atribuida_para_id: string | null;
  em_distribuicao: boolean;
  agente_ia_ativo?: boolean;
}
interface ChatPanelProps {
  conversaId: string | null;
  contato?: Contato;
  onToggleDetails: () => void;
  showDetailsButton: boolean;
  conversaInfo?: ConversaInfo;
  contaId?: string | null;
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
  mensagem_externa_id?: string;
  nome_remetente?: string;
  resposta_para_id?: string;
  lida_confirmada_em?: string;
  url_midia?: string;
  transcricao_audio?: string | null;
  transcricao_processada_em?: string | null;
  metadata?: {
    fileName?: string;
    mimeType?: string;
    duration?: number;
    [key: string]: any;
  } | null;
}
interface Reacao {
  id: string;
  mensagem_id: string;
  emoji: string;
  reagido_por_tipo: 'usuario' | 'contato';
  reagido_por_usuario_id?: string;
  reagido_por_contato_id?: string;
}
export function ChatPanel({
  conversaId,
  contato,
  onToggleDetails,
  showDetailsButton,
  conversaInfo,
  contaId
}: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Mensagem | null>(null);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document'>('image');
  const [showCart, setShowCart] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Hook para controle da janela de 24h
  const {
    janelaAberta,
    tempoRestanteFormatado,
    isLoading: isLoadingJanela
  } = useJanela24h(conversaId);

  // Hook para resgate de conversa
  const {
    atribuirConversaManual,
    isAtribuindo
  } = useWhatsAppDistribuicao();
  // Fetch current user
  const {
    data: currentUser
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch current user profile
  const {
    data: currentUserProfile
  } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data
      } = await supabase.from('perfis_usuario').select('id, nome_completo, foto_perfil_url').eq('id', user.id).single();
      return data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch messages with reply references
  const {
    data: mensagens = [],
    isLoading
  } = useQuery({
    queryKey: ['whatsapp-mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const {
        data,
        error
      } = await supabase.from('whatsapp_mensagens').select(`
          id, corpo, tipo_mensagem, direcao, status, criado_em,
          enviada_por_bot, enviada_por_usuario_id, mensagem_externa_id,
          nome_remetente, resposta_para_id, lida_confirmada_em,
          url_midia, transcricao_audio, transcricao_processada_em,
          metadata
        `).eq('conversa_id', conversaId).order('criado_em', {
        ascending: true
      }).limit(100);
      if (error) throw error;

      // Fetch user names for outgoing messages
      const userIds = [...new Set(data.filter(m => m.enviada_por_usuario_id).map(m => m.enviada_por_usuario_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const {
          data: profiles
        } = await supabase.from('perfis_usuario').select('id, nome_completo').in('id', userIds);
        userMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.nome_completo || 'Operador';
          return acc;
        }, {} as Record<string, string>);
      }
      return data.map(m => ({
        ...m,
        operador_nome: m.enviada_por_usuario_id ? userMap[m.enviada_por_usuario_id] : undefined
      })) as (Mensagem & {
        operador_nome?: string;
      })[];
    },
    enabled: !!conversaId
  });

  // Auto-transcrever áudios recebidos (quando ainda não existe transcrição)
  const inFlightTranscricoesRef = useRef<Set<string>>(new Set());
  const transcreverAudioMutation = useMutation({
    mutationFn: async (mensagemId: string) => {
      const schema = z.object({
        mensagemId: z.string().uuid()
      });
      const parsed = schema.parse({
        mensagemId
      });
      const {
        data,
        error
      } = await supabase.functions.invoke('transcrever-audio-whatsapp', {
        body: parsed
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!conversaId) return;
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
    },
    onError: (err: any) => {
      const msg = err?.message || 'Falha ao transcrever áudio';
      toast.error(msg);
    }
  });
  useEffect(() => {
    if (!conversaId) return;
    if (isLoading) return;
    const pendentes = mensagens.filter(m => m.tipo_mensagem === 'audio' && !!m.url_midia && !m.transcricao_audio);
    const proximo = pendentes.find(m => !inFlightTranscricoesRef.current.has(m.id));
    if (!proximo) return;
    inFlightTranscricoesRef.current.add(proximo.id);
    transcreverAudioMutation.mutate(proximo.id, {
      onSettled: () => {
        inFlightTranscricoesRef.current.delete(proximo.id);
      }
    });
  }, [conversaId, isLoading, mensagens, transcreverAudioMutation]);
  // Mark all unread messages as read when conversation is selected
  useEffect(() => {
    if (!conversaId) return;
    const marcarTodasComoLidas = async () => {
      // Get unread messages for this conversation
      const {
        data: mensagensNaoLidas
      } = await supabase.from('whatsapp_mensagens').select('id').eq('conversa_id', conversaId).eq('direcao', 'recebida').is('status_lida_em', null);
      if (mensagensNaoLidas && mensagensNaoLidas.length > 0) {
        const idsNaoLidas = mensagensNaoLidas.map(m => m.id);

        // Update all as read
        await supabase.from('whatsapp_mensagens').update({
          status_lida_em: new Date().toISOString()
        }).in('id', idsNaoLidas);

        // Invalidate queries to update UI
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-conversas-v2']
        });
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-mensagens', conversaId]
        });
      }
    };
    marcarTodasComoLidas();
  }, [conversaId, queryClient]);

  // Fetch reactions for all messages
  const messageIds = mensagens.map(m => m.id);
  const {
    data: reacoes = []
  } = useQuery({
    queryKey: ['whatsapp-reacoes', messageIds],
    queryFn: async () => {
      if (messageIds.length === 0) return [];
      const {
        data
      } = await supabase.from('whatsapp_reacoes').select('*').in('mensagem_id', messageIds);
      return (data || []) as Reacao[];
    },
    enabled: messageIds.length > 0
  });

  // Group reactions by message
  const reacoesPorMensagem = reacoes.reduce((acc, r) => {
    if (!acc[r.mensagem_id]) acc[r.mensagem_id] = [];
    acc[r.mensagem_id].push(r);
    return acc;
  }, {} as Record<string, Reacao[]>);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!conversaId || !contato) throw new Error('Conversa não selecionada');
      const {
        data: conversa
      } = await supabase.from('whatsapp_conversas').select('whatsapp_conta_id').eq('id', conversaId).single();
      if (!conversa) throw new Error('Conversa não encontrada');
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      return whatsAppService.sendTextMessage(conversaId, texto, conversa.whatsapp_conta_id, contato.id, user.id, replyingTo?.id // Pass reply reference
      );
    },
    onSuccess: () => {
      setMessage('');
      setReplyingTo(null);
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
    },
    onError: error => {
      toast.error('Erro ao enviar mensagem', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    }
  });

  // React mutation
  const reactMutation = useMutation({
    mutationFn: async ({
      mensagemId,
      emoji
    }: {
      mensagemId: string;
      emoji: string;
    }) => {
      if (!currentUser) throw new Error('Usuário não autenticado');
      return whatsAppService.sendReaction(mensagemId, emoji, currentUser.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-reacoes']
      });
    },
    onError: error => {
      toast.error('Erro ao reagir', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    }
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (mensagemId: string) => {
      if (!currentUser) throw new Error('Usuário não autenticado');
      return whatsAppService.removeReaction(mensagemId, currentUser.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-reacoes']
      });
    }
  });

  // Send media mutation
  const sendMediaMutation = useMutation({
    mutationFn: async ({
      tipo,
      midiaUrl,
      caption,
      fileName,
      mimeType
    }: {
      tipo: 'imagem' | 'video' | 'audio' | 'documento';
      midiaUrl: string;
      caption?: string;
      fileName?: string;
      mimeType?: string;
    }) => {
      if (!conversaId || !contato) throw new Error('Conversa não selecionada');
      const {
        data: conversa
      } = await supabase.from('whatsapp_conversas').select('whatsapp_conta_id').eq('id', conversaId).single();
      if (!conversa) throw new Error('Conversa não encontrada');
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      return whatsAppService.sendMediaMessage(conversaId, tipo, midiaUrl, conversa.whatsapp_conta_id, contato.id, user.id, caption, fileName, mimeType);
    },
    onSuccess: () => {
      setShowMediaUploader(false);
      setShowAudioRecorder(false);
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
      toast.success('Mídia enviada com sucesso');
    },
    onError: error => {
      toast.error('Erro ao enviar mídia', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    }
  });

  // Toggle agente IA mutation
  const toggleAgenteMutation = useMutation({
    mutationFn: async () => {
      if (!conversaId) throw new Error('Conversa não selecionada');
      const novoStatus = !(conversaInfo?.agente_ia_ativo ?? true);
      const {
        error
      } = await supabase.from('whatsapp_conversas').update({
        agente_ia_ativo: novoStatus
      }).eq('id', conversaId);
      if (error) throw error;
      return novoStatus;
    },
    onSuccess: novoStatus => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversas-v2']
      });
      toast.success(novoStatus ? 'Agente IA ativado para esta conversa' : 'Agente IA desativado para esta conversa');
    },
    onError: () => {
      toast.error('Erro ao alterar status do agente');
    }
  });

  // Mark as read when message is visible
  const markAsRead = useCallback(async (mensagemId: string) => {
    await whatsAppService.markAsRead(mensagemId);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [mensagens]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!conversaId) return;
    const channel = supabase.channel(`mensagens-${conversaId}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'whatsapp_mensagens',
      filter: `conversa_id=eq.${conversaId}`
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'whatsapp_mensagens',
      filter: `conversa_id=eq.${conversaId}`
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient]);

  // Realtime subscription for reactions
  useEffect(() => {
    if (messageIds.length === 0) return;
    const channel = supabase.channel('reacoes-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'whatsapp_reacoes'
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-reacoes']
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds, queryClient]);
  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };
  const handleReply = (msg: Mensagem) => {
    setReplyingTo(msg);
  };
  const handleReact = (mensagemId: string, emoji: string) => {
    reactMutation.mutate({
      mensagemId,
      emoji
    });
  };
  const handleRemoveReaction = (mensagemId: string) => {
    removeReactionMutation.mutate(mensagemId);
  };

  // Handle media upload complete
  const handleMediaUploadComplete = (url: string, type: 'image' | 'video' | 'audio' | 'document', fileName?: string, mimeType?: string) => {
    // Map English type to Portuguese
    const tipoMap: Record<string, 'imagem' | 'video' | 'audio' | 'documento'> = {
      image: 'imagem',
      video: 'video',
      audio: 'audio',
      document: 'documento'
    };
    sendMediaMutation.mutate({
      tipo: tipoMap[type],
      midiaUrl: url,
      caption: fileName,
      fileName,
      mimeType
    });
  };

  // Handle audio record complete
  const handleAudioRecordComplete = (url: string, duration: number) => {
    sendMediaMutation.mutate({
      tipo: 'audio',
      midiaUrl: url,
      caption: `Áudio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
      mimeType: 'audio/ogg'
    });
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  // Get the message being replied to
  const getReplyMessage = (replyId: string | undefined) => {
    if (!replyId) return null;
    return mensagens.find(m => m.id === replyId);
  };
  if (!conversaId) {
    return <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm">Escolha uma conversa para ver as mensagens</p>
        </div>
      </div>;
  }
  const getInitials = (nome: string) => {
    return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };
  return <div className="h-full flex flex-col bg-background">
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
          {/* Badge de status da janela 24h */}
          <JanelaStatusBadge janelaAberta={janelaAberta} tempoRestanteFormatado={tempoRestanteFormatado} isLoading={isLoadingJanela} compact={false} />
          
          {/* Badge indicando status do agente IA */}
          {(conversaInfo?.agente_ia_ativo ?? true) && !conversaInfo?.atribuida_para_id && <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 ml-1">
              <Bot className="h-3 w-3 mr-1" />
              IA Ativo
            </Badge>}
          
          {/* Botão do Carrinho em tempo real */}
          <div className="relative">
            <CartPanel
              conversaId={conversaId!}
              collapsed={true}
              onToggle={() => setShowCart(!showCart)}
            />
            {showCart && (
              <div className="absolute top-full right-0 mt-2 z-[100]">
                <CartPanel
                  conversaId={conversaId!}
                  collapsed={false}
                  onToggle={() => setShowCart(false)}
                />
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          {showDetailsButton && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleDetails}>
              <PanelRightOpen className="h-4 w-4" />
            </Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleAgenteMutation.mutate()} disabled={toggleAgenteMutation.isPending} className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {conversaInfo?.agente_ia_ativo ?? true ? 'Desativar Agente IA' : 'Ativar Agente IA'}
              </DropdownMenuItem>
              <DropdownMenuItem>Fechar conversa</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
                Transferir
              </DropdownMenuItem>
              <DropdownMenuItem>Bloquear contato</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Banner de Resgate - quando conversa está na fila sem operador */}
      {conversaInfo && !conversaInfo.atribuida_para_id && conversaInfo.em_distribuicao && <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-200 truncate">
              Esta conversa está aguardando atendimento na fila
            </span>
          </div>
          <Button size="sm" onClick={() => {
        if (conversaId && currentUser?.id) {
          atribuirConversaManual({
            conversaId,
            atendenteId: currentUser.id
          });
        }
      }} disabled={isAtribuindo || !currentUser} className="shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            {isAtribuindo ? 'Resgatando...' : 'Resgatar Conversa'}
          </Button>
        </div>}

      {/* Messages Area */}
      {/* Messages Area - WhatsApp Style */}
      <ScrollArea className="flex-1 relative">
        <div 
          className="min-h-full px-4 py-6" 
          style={{
            background: 'linear-gradient(180deg, #e8f4f6 0%, #dce8ea 50%, #d4e0e2 100%)',
            backgroundImage: `
              linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%),
              url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
            `
          }}
        >
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <Skeleton className="h-16 w-64 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center mb-4 shadow-sm">
                <MessageCircle className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Nenhuma mensagem ainda</p>
              <p className="text-sm text-slate-400 mt-1">As mensagens aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mensagens.map((msg, index) => {
                const prevMsg = mensagens[index - 1];
                const showSender = !prevMsg || prevMsg.direcao !== msg.direcao;
                const msgReacoes = reacoesPorMensagem[msg.id] || [];
                const replyMessage = getReplyMessage(msg.resposta_para_id);

                // Check if we need a date divider
                const msgDate = new Date(msg.criado_em);
                const prevMsgDate = prevMsg ? new Date(prevMsg.criado_em) : null;
                const showDateDivider = !prevMsgDate || !isSameDay(msgDate, prevMsgDate);
                
                return (
                  <div key={msg.id}>
                    {showDateDivider && <DateDivider date={msgDate} />}
                    <MessageBubble 
                      mensagem={msg} 
                      contato={contato} 
                      showSender={showSender} 
                      operadorNome={msg.operador_nome || currentUserProfile?.nome_completo} 
                      reacoes={msgReacoes} 
                      currentUserId={currentUser?.id} 
                      currentUserProfile={currentUserProfile} 
                      replyMessage={replyMessage} 
                      onReply={() => handleReply(msg)} 
                      onReact={emoji => handleReact(msg.id, emoji)} 
                      onRemoveReaction={() => handleRemoveReaction(msg.id)} 
                      onMarkAsRead={() => markAsRead(msg.id)} 
                    />
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && <div className="px-3 pt-2">
          <ReplyPreview message={replyingTo} onCancel={() => setReplyingTo(null)} />
        </div>}

      {/* Media Uploader Modal */}
      {showMediaUploader && <div className="p-3 border-t bg-card">
          <MediaUploader onUploadComplete={handleMediaUploadComplete} onCancel={() => setShowMediaUploader(false)} acceptedTypes={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar'} />
        </div>}

      {/* Audio Recorder Modal */}
      {showAudioRecorder && <div className="p-3 border-t bg-card">
          <AudioRecorder onRecordComplete={handleAudioRecordComplete} onCancel={() => setShowAudioRecorder(false)} />
        </div>}

      {/* Input Area - Condicional baseado na janela 24h */}
      {!showMediaUploader && !showAudioRecorder && <>
          {janelaAberta ?
      // Input normal - janela aberta
      <div className="p-3 border-t bg-card">
              <div className="flex items-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => {
                setMediaType('image');
                setShowMediaUploader(true);
              }}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Imagem
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                setMediaType('video');
                setShowMediaUploader(true);
              }}>
                      <Video className="h-4 w-4 mr-2" />
                      Vídeo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                setMediaType('document');
                setShowMediaUploader(true);
              }}>
                      <FileText className="h-4 w-4 mr-2" />
                      Documento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <EmojiPicker onSelect={handleEmojiSelect} />

                <Textarea ref={textareaRef} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={replyingTo ? "Digite sua resposta..." : "Digite sua mensagem..."} className="min-h-[36px] max-h-32 resize-none" rows={1} />

                {message.trim() ? <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={sendMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button> : <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowAudioRecorder(true)}>
                    <Mic className="h-4 w-4" />
                  </Button>}
              </div>
            </div> :
      // Área de templates - janela fechada
      <div className="p-4 border-t bg-muted/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Janela de 24h expirada. Use um template aprovado para reabrir.
                  </span>
                </div>
                <Button onClick={() => setShowTemplateSelector(true)} className="shrink-0">
                  <MessageSquareText className="h-4 w-4 mr-2" />
                  Enviar Template
                </Button>
              </div>
            </div>}
        </>}

      {/* Modal de Seleção de Template */}
      <TemplateSelectorModal isOpen={showTemplateSelector} onClose={() => setShowTemplateSelector(false)} contaId={contaId || null} conversaId={conversaId || ''} contatoId={contato?.id || ''} numeroDestino={contato?.numero_whatsapp || ''} />
      
      {/* Modal de Transferência de Conversa */}
      <TransferirConversaDialog 
        open={showTransferDialog} 
        onOpenChange={setShowTransferDialog} 
        conversaId={conversaId || ''} 
        contatoNome={contato?.nome_whatsapp || 'Desconhecido'} 
        operadorAtualId={conversaInfo?.atribuida_para_id} 
      />
    </div>;
}
interface MessageBubbleProps {
  mensagem: Mensagem & {
    operador_nome?: string;
  };
  contato?: Contato;
  showSender?: boolean;
  operadorNome?: string;
  reacoes: Reacao[];
  currentUserId?: string;
  currentUserProfile?: {
    id: string;
    nome_completo: string | null;
    foto_perfil_url: string | null;
  } | null;
  replyMessage?: Mensagem | null;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onRemoveReaction: () => void;
  onMarkAsRead: () => void;
}
function MessageBubble({
  mensagem,
  contato,
  showSender = true,
  operadorNome,
  reacoes,
  currentUserId,
  currentUserProfile,
  replyMessage,
  onReply,
  onReact,
  onRemoveReaction,
  onMarkAsRead
}: MessageBubbleProps) {
  const isOutgoing = mensagem.direcao === 'enviada';
  const messageRef = useRef<HTMLDivElement>(null);

  // Mark as read when message becomes visible (for incoming messages)
  useEffect(() => {
    if (!isOutgoing && !mensagem.lida_confirmada_em && mensagem.mensagem_externa_id) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          onMarkAsRead();
          observer.disconnect();
        }
      }, {
        threshold: 0.5
      });
      if (messageRef.current) {
        observer.observe(messageRef.current);
      }
      return () => observer.disconnect();
    }
  }, [isOutgoing, mensagem.lida_confirmada_em, mensagem.mensagem_externa_id, onMarkAsRead]);
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
    return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };
  const senderName = isOutgoing ? operadorNome || 'Operador' : contato?.nome_whatsapp || 'Cliente';
  const formattedTime = format(new Date(mensagem.criado_em), 'HH:mm', {
    locale: ptBR
  });

  // Transform reactions for display
  const groupedReactions = reacoes.reduce((acc, r) => {
    const existing = acc.find(a => a.emoji === r.emoji);
    if (existing) {
      existing.count++;
      if (r.reagido_por_usuario_id === currentUserId) {
        existing.hasUserReacted = true;
      }
    } else {
      acc.push({
        emoji: r.emoji,
        count: 1,
        hasUserReacted: r.reagido_por_usuario_id === currentUserId
      });
    }
    return acc;
  }, [] as {
    emoji: string;
    count: number;
    hasUserReacted: boolean;
  }[]);
  return (
    <div ref={messageRef} className={cn(
      "flex gap-3 group animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      isOutgoing ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <Avatar className={cn(
        "h-9 w-9 shrink-0 mt-1 shadow-lg ring-2 ring-white/80 transition-transform group-hover:scale-105",
        isOutgoing ? "ring-primary/20" : "ring-slate-200"
      )}>
        {isOutgoing ? (
          <>
            <AvatarImage src={currentUserProfile?.foto_perfil_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
              {currentUserProfile?.nome_completo ? getInitials(currentUserProfile.nome_completo) : 'Eu'}
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src={contato?.foto_url} />
            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold">
              {getInitials(contato?.nome_whatsapp || 'CL')}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div className={cn("flex flex-col max-w-[75%]", isOutgoing ? "items-end" : "items-start")}>
        {/* Sender Name & Time */}
        {showSender && (
          <div className={cn(
            "flex items-center gap-2 mb-1.5 text-[11px]",
            isOutgoing ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{senderName}</span>
            <span className="text-slate-400">{formattedTime}</span>
          </div>
        )}

        {/* Reply Reference */}
        {replyMessage && (
          <div className={cn(
            "flex items-center gap-1.5 text-[11px] text-slate-500 mb-2 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-3 border-primary/60 shadow-sm",
            isOutgoing ? "flex-row-reverse border-l-0 border-r-3" : "flex-row"
          )}>
            <CornerDownLeft className="h-3 w-3 text-primary/70" />
            <span className="truncate max-w-[200px] italic">
              {replyMessage.corpo}
            </span>
          </div>
        )}

        {/* Message Bubble */}
        <div className={cn(
          "relative px-4 py-3 rounded-2xl transition-all duration-200 group-hover:shadow-lg",
          isOutgoing 
            ? "bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground rounded-tr-sm shadow-md shadow-primary/20" 
            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-md shadow-slate-200/50 dark:shadow-slate-900/30 border border-white/50 dark:border-slate-700/50"
        )}>
          {mensagem.enviada_por_bot && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] mb-2 px-2 py-0.5 font-medium rounded-full",
                isOutgoing 
                  ? "bg-white/20 text-white border-0" 
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              )}
            >
              🤖 Bot
            </Badge>
          )}

          {/* Render media based on type */}
          {mensagem.tipo_mensagem === 'imagem' && mensagem.url_midia && <div className="mb-2">
              <img src={mensagem.url_midia} alt="Imagem" className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(mensagem.url_midia, '_blank')} />
            </div>}

          {mensagem.tipo_mensagem === 'video' && mensagem.url_midia && <div className="mb-2">
              <video src={mensagem.url_midia} controls className="max-w-full rounded-lg max-h-64" />
            </div>}

          {mensagem.tipo_mensagem === 'audio' && mensagem.url_midia && <div className="mb-2 space-y-2">
              <audio src={mensagem.url_midia} controls className="max-w-full min-w-[200px]" />

              <div className={cn("text-xs leading-relaxed whitespace-pre-wrap", isOutgoing ? "text-primary-foreground/90" : "text-muted-foreground")}>
                {mensagem.transcricao_audio ? <span>
                    <span className={cn(isOutgoing ? "text-primary-foreground" : "text-foreground")}>Transcrição:</span>{' '}
                    {mensagem.transcricao_audio}
                  </span> : <span>Transcrevendo áudio…</span>}
              </div>
            </div>}

          {mensagem.tipo_mensagem === 'documento' && mensagem.url_midia && <div className="mb-2">
              <a href={mensagem.url_midia} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2 p-2 rounded-lg transition-colors", isOutgoing ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500")}>
                <FileText className="h-6 w-6" />
                <span className="text-sm truncate max-w-[150px]">
                  {(mensagem.metadata as any)?.fileName || 'Documento'}
                </span>
                <Download className="h-4 w-4 ml-auto" />
              </a>
            </div>}

          {/* Text content */}
          {mensagem.corpo && mensagem.tipo_mensagem !== 'documento' && !(mensagem.tipo_mensagem === 'audio' && mensagem.corpo === '[Áudio]') && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {mensagem.corpo}
            </p>}
          
          {/* Status indicator for outgoing */}
          {isOutgoing && <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5">
              {getStatusIcon()}
            </div>}

          {/* Reply button (appears on hover) */}
          <Button variant="ghost" size="icon" className={cn("absolute -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm border", isOutgoing ? "-left-2" : "-right-2")} onClick={onReply} title="Responder">
            <Reply className="h-3 w-3" />
          </Button>
        </div>

        {/* Reactions */}
        <MessageReactions reactions={groupedReactions} onReact={onReact} onRemoveReaction={onRemoveReaction} isOutgoing={isOutgoing} />
      </div>
    </div>
  );
}