import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, Phone, Video, MoreVertical, MessageSquare, Clock, CheckCheck, ChevronRight, Mail, Building2, Briefcase, Tag, TrendingUp, ExternalLink, AlertCircle, RotateCw, Image as ImageIcon, FileText, Mic } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import MediaUploader from "./MediaUploader";
import AudioRecorder from "./AudioRecorder";
import { Separator } from "@/components/ui/separator";
interface ChatAreaProps {
  conversaId: string | null;
  contaId: string;
}
const ChatArea = ({
  conversaId,
  contaId
}: ChatAreaProps) => {
  const [mensagem, setMensagem] = useState("");
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document'>('image');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const {
    isWAPI
  } = useWhatsAppConfig();
  const {
    data: conversa
  } = useQuery({
    queryKey: ['whatsapp-conversa', conversaId],
    queryFn: async () => {
      if (!conversaId) return null;
      const {
        data,
        error
      } = await supabase.from('whatsapp_conversas').select(`
          *,
          whatsapp_contatos (
            id,
            numero_whatsapp,
            nome_whatsapp,
            foto_perfil_url,
            contato_id,
            contatos (
              id,
              nome_completo,
              primeiro_nome,
              email,
              celular,
              cargo,
              conta_id
            )
          )
        `).eq('id', conversaId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId
  });
  const {
    data: mensagens
  } = useQuery({
    queryKey: ['whatsapp-mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const {
        data,
        error
      } = await supabase.from('whatsapp_mensagens').select('*').eq('conversa_id', conversaId).order('criado_em', {
        ascending: true
      });
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId
  });
  const enviarMensagemMutation = useMutation({
    mutationFn: async ({ 
      corpo, 
      tipoMensagem = 'texto', 
      urlMidia, 
      nomeArquivo, 
      mimeType,
      duracaoAudio 
    }: { 
      corpo?: string; 
      tipoMensagem?: string;
      urlMidia?: string;
      nomeArquivo?: string;
      mimeType?: string;
      duracaoAudio?: number;
    }) => {
      if (!conversaId || !conversa) return;

      const tipoMidia = mimeType?.split('/')[0] as 'image' | 'video' | 'audio' | 'document' | undefined;

      // Criar a mensagem no banco como pendente
      const {
        data,
        error
      } = await supabase.from('whatsapp_mensagens').insert({
        conversa_id: conversaId,
        whatsapp_conta_id: contaId,
        whatsapp_contato_id: conversa.whatsapp_contato_id,
        corpo: corpo || '',
        direcao: 'enviada',
        tipo_mensagem: tipoMensagem,
        tem_midia: !!urlMidia,
        tipo_midia: tipoMidia,
        url_midia: urlMidia,
        nome_arquivo: nomeArquivo,
        mime_type: mimeType,
        duracao_midia_segundos: duracaoAudio,
        status: 'pendente',
        enviada_por_usuario_id: (await supabase.auth.getUser()).data.user?.id
      }).select().single();
      if (error) throw error;

      // Enviar via adapter
      if (data) {
        try {
          const {
            whatsappAdapter
          } = await import('@/lib/whatsappAdapter');
          await whatsappAdapter.enviarMensagem(data.id);
        } catch (functionError) {
          console.error('Erro ao enviar via adapter:', functionError);
        }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversas']
      });
      setMensagem("");
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem está sendo enviada"
      });
    },
    onError: error => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const reenviarMensagemMutation = useMutation({
    mutationFn: async (mensagemId: string) => {
      // Atualizar status para pendente e limpar erro
      await supabase.from('whatsapp_mensagens').update({
        status: 'pendente',
        erro_mensagem: null,
        erro_codigo: null,
        status_falhou_em: null
      }).eq('id', mensagemId);

      // Reenviar via adapter
      const {
        whatsappAdapter
      } = await import('@/lib/whatsappAdapter');
      await whatsappAdapter.enviarMensagem(mensagemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
      toast({
        title: "Mensagem reenviada",
        description: "A mensagem está sendo enviada novamente"
      });
    },
    onError: error => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-mensagens', conversaId]
      });
      toast({
        title: "Erro ao reenviar",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleEnviar = () => {
    if (!mensagem.trim()) return;
    enviarMensagemMutation.mutate({ corpo: mensagem });
  };

  const handleMediaUpload = (url: string, type: 'image' | 'video' | 'audio' | 'document', fileName?: string, mimeType?: string) => {
    const tipoMensagem = type === 'image' ? 'imagem' : 
                         type === 'video' ? 'video' : 
                         type === 'audio' ? 'audio' : 'documento';
    
    enviarMensagemMutation.mutate({ 
      tipoMensagem, 
      urlMidia: url, 
      nomeArquivo: fileName,
      mimeType,
      corpo: mensagem // Usar a mensagem digitada como caption/legenda
    });
    setMensagem("");
    setShowMediaUploader(false);
  };

  const handleAudioRecord = (url: string, duration: number) => {
    enviarMensagemMutation.mutate({ 
      tipoMensagem: 'audio', 
      urlMidia: url,
      duracaoAudio: duration,
      mimeType: 'audio/ogg'
    });
    setShowAudioRecorder(false);
  };

  const openMediaUploader = (type: 'image' | 'video' | 'document') => {
    setMediaType(type);
    setShowMediaUploader(true);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [mensagens]);
  if (!conversaId) {
    return <Card className="h-full flex items-center justify-center bg-card/30 backdrop-blur">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma conversa na lista para começar a atender
          </p>
        </div>
      </Card>;
  }
  const nomeContato = conversa?.whatsapp_contatos?.contatos?.nome_completo || conversa?.whatsapp_contatos?.nome_whatsapp || conversa?.whatsapp_contatos?.numero_whatsapp;
  const iniciais = nomeContato?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Regra: API não oficial (W-API) não precisa de janela de 24h
  const podeEnviar = isWAPI || conversa?.janela_24h_ativa;
  return <Card className="h-full min-h-0 flex flex-col bg-card/50 backdrop-blur border-muted">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-br from-muted/30 to-transparent bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-muted/20 rounded-lg p-2 -m-2 transition-colors" onClick={() => setDetalhesOpen(true)}>
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
                {conversa?.janela_24h_ativa && <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Janela 24h ativa
                  </Badge>}
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
              {conversa?.whatsapp_contatos?.nome_whatsapp && <p className="text-sm text-muted-foreground">
                  @{conversa.whatsapp_contatos.nome_whatsapp}
                </p>}
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

              {conversa?.whatsapp_contatos?.contatos?.email && <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p>{conversa.whatsapp_contatos.contatos.email}</p>
                  </div>
                </div>}

              {conversa?.whatsapp_contatos?.contatos?.celular && <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Celular</p>
                    <p>{conversa.whatsapp_contatos.contatos.celular}</p>
                  </div>
                </div>}

              {conversa?.whatsapp_contatos?.contatos?.cargo && <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Cargo</p>
                    <p>{conversa.whatsapp_contatos.contatos.cargo}</p>
                  </div>
                </div>}
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
                  <Badge variant={conversa?.prioridade === 'alta' ? 'destructive' : conversa?.prioridade === 'media' ? 'default' : 'secondary'}>
                    {conversa?.prioridade || 'normal'}
                  </Badge>
                </div>

                {conversa?.ultima_mensagem_em && <div className="flex justify-between">
                    <span className="text-muted-foreground">Última mensagem:</span>
                    <span>{format(new Date(conversa.ultima_mensagem_em), 'dd/MM/yyyy HH:mm', {
                    locale: ptBR
                  })}</span>
                  </div>}

                {conversa?.sentimento_cliente && <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sentimento:</span>
                    <span className="flex items-center gap-1">
                      {conversa.emoji_sentimento && <span>{conversa.emoji_sentimento}</span>}
                      <span className="capitalize">{conversa.sentimento_cliente}</span>
                    </span>
                  </div>}

                {conversa?.tags && conversa.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                    {conversa.tags.map((tag, idx) => <Badge key={idx} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>)}
                  </div>}
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => {
              const contaId = conversa?.whatsapp_contatos?.contatos?.conta_id;
              if (contaId) {
                window.location.href = `/clientes/${contaId}`;
              } else {
                toast({
                  title: "Cliente não vinculado",
                  description: "Este contato ainda não está vinculado a um cliente.",
                  variant: "destructive"
                });
              }
            }}>
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
          {mensagens?.map(msg => {
          const isEnviada = msg.direcao === 'enviada';
          const isErro = msg.status === 'erro';
          return <div key={msg.id} className={cn("flex flex-col gap-1", isEnviada ? "items-end" : "items-start")}>
                <div className={cn("max-w-[70%] rounded-2xl overflow-hidden", isEnviada ? isErro ? "bg-destructive/10 border border-destructive/30" : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground" : "bg-muted")}>
                  {/* Preview de Mídia */}
                  {msg.tem_midia && msg.url_midia && (
                    <div className="w-full">
                      {msg.tipo_midia === 'image' && (
                        <img src={msg.url_midia} alt="Imagem" className="w-full max-h-64 object-cover" />
                      )}
                      {msg.tipo_midia === 'video' && (
                        <video src={msg.url_midia} controls className="w-full max-h-64" />
                      )}
                      {msg.tipo_midia === 'audio' && (
                        <div className="p-3">
                          <audio src={msg.url_midia} controls className="w-full" />
                        </div>
                      )}
                      {msg.tipo_midia === 'document' && (
                        <div className="p-3 flex items-center gap-2 bg-background/10">
                          <FileText className="w-8 h-8" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{msg.nome_arquivo || 'Documento'}</p>
                            <p className="text-xs opacity-70">Documento</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Texto da mensagem */}
                  {msg.corpo && (
                    <div className="px-4 py-2">
                      <p className="text-sm whitespace-pre-wrap">{msg.corpo}</p>
                    </div>
                  )}

                  {/* Timestamp e Status */}
                  <div className="px-4 pb-2 flex items-center justify-end gap-1">
                    <span className="text-xs opacity-70">
                      {format(new Date(msg.criado_em), 'HH:mm', {
                    locale: ptBR
                  })}
                    </span>
                    {isEnviada && !isErro && <CheckCheck className={cn("w-4 h-4", msg.status === 'lida' ? "text-blue-400" : "opacity-70")} />}
                    {isErro && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                
                {isErro && msg.erro_mensagem && <div className="max-w-[70%] px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-destructive font-medium mb-1">Erro ao enviar:</p>
                        <p className="text-xs text-muted-foreground break-words">{msg.erro_mensagem}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 w-full text-xs h-7 border-destructive/30 hover:bg-destructive/10" onClick={() => reenviarMensagemMutation.mutate(msg.id)} disabled={reenviarMensagemMutation.isPending}>
                      <RotateCw className="w-3 h-3 mr-1" />
                      Reenviar
                    </Button>
                  </div>}
              </div>;
        })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-gradient-to-br from-muted/20 to-transparent space-y-3">
        {!podeEnviar && <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Janela de 24h expirada. Você só pode enviar mensagens aprovadas pelo WhatsApp (templates).
            </p>
          </div>}

        {/* Media Uploader */}
        {showMediaUploader && (
          <MediaUploader
            onUploadComplete={handleMediaUpload}
            onCancel={() => setShowMediaUploader(false)}
            acceptedTypes={
              mediaType === 'image' ? 'image/*' :
              mediaType === 'video' ? 'video/*' :
              'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar'
            }
          />
        )}

        {/* Audio Recorder */}
        {showAudioRecorder && (
          <AudioRecorder
            onRecordComplete={handleAudioRecord}
            onCancel={() => setShowAudioRecorder(false)}
          />
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!podeEnviar}>
                <Paperclip className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => openMediaUploader('image')}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Enviar Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openMediaUploader('video')}>
                <Video className="w-4 h-4 mr-2" />
                Enviar Vídeo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAudioRecorder(true)}>
                <Mic className="w-4 h-4 mr-2" />
                Gravar Áudio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openMediaUploader('document')}>
                <FileText className="w-4 h-4 mr-2" />
                Enviar Documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Textarea 
            placeholder={showMediaUploader || showAudioRecorder ? "Digite uma legenda (opcional)..." : "Digite sua mensagem..."} 
            value={mensagem} 
            onChange={e => setMensagem(e.target.value)} 
            onKeyPress={handleKeyPress} 
            className="min-h-[50px] max-h-[120px] resize-none bg-background/50" 
            disabled={!podeEnviar} 
          />
          
          <Button 
            onClick={handleEnviar} 
            disabled={!mensagem.trim() || enviarMensagemMutation.isPending || !podeEnviar} 
            className="bg-gradient-to-br from-primary to-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>;
};
export default ChatArea;