import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, CheckCircle2, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SugestaoIA {
  titulo_sugerido?: string;
  descricao_completa?: string;
  prioridade_sugerida?: "baixa" | "normal" | "alta" | "urgente";
  fila_sugerida?: string;
  justificativa?: string;
  perguntas_pendentes?: string[];
}

interface ChatAssistenteCriacaoProps {
  contextoInicial: {
    titulo?: string;
    descricao?: string;
    cliente?: string;
  };
  onSugestoesRecebidas: (sugestoes: SugestaoIA) => void;
  onMensagensChange?: (mensagens: Message[]) => void;
  sugestoesIA?: SugestaoIA | null;
  isClassificando?: boolean;
  isCriandoTicket?: boolean;
  onCriarTicket?: (e: React.FormEvent) => void;
}

export default function ChatAssistenteCriacao({
  contextoInicial,
  onSugestoesRecebidas,
  onMensagensChange,
  sugestoesIA,
  isClassificando,
  isCriandoTicket,
  onCriarTicket,
}: ChatAssistenteCriacaoProps) {
  const [mensagens, setMensagens] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Olá! Estou aqui para te ajudar a criar um ticket completo. Vou fazer algumas perguntas para entender melhor o problema. Pode começar me contando o que aconteceu? Você também pode anexar fotos se precisar.",
    },
  ]);
  const [inputMensagem, setInputMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [perguntasRespondidas, setPerguntasRespondidas] = useState(0);
  const [anexosSelecionados, setAnexosSelecionados] = useState<File[]>([]);
  const [uploadando, setUploadando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Notificar mudanças nas mensagens
  useEffect(() => {
    if (onMensagensChange) {
      onMensagensChange(mensagens);
    }
  }, [mensagens, onMensagensChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const novosAnexos = Array.from(files).filter((file) => {
      // Aceitar imagens até 10MB
      if (file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024) {
        return true;
      }
      toast.error(`${file.name}: arquivo não suportado ou muito grande (máx 10MB)`);
      return false;
    });

    setAnexosSelecionados((prev) => [...prev, ...novosAnexos]);
    e.target.value = ""; // Reset input
  };

  const removerAnexo = (index: number) => {
    setAnexosSelecionados((prev) => prev.filter((_, i) => i !== index));
  };

  const enviarMensagem = async () => {
    if ((!inputMensagem.trim() && anexosSelecionados.length === 0) || enviando) return;

    const mensagemUsuario = inputMensagem.trim();
    setInputMensagem("");

    let conteudoMensagem = mensagemUsuario;

    // Upload de anexos se houver
    if (anexosSelecionados.length > 0) {
      setUploadando(true);
      const urlsAnexos: string[] = [];

      try {
        for (const file of anexosSelecionados) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("ticket_id", "temp"); // Temporário até ter ticket criado

          const { data: session } = await supabase.auth.getSession();
          if (!session.session) throw new Error("Não autenticado");

          const response = await supabase.functions.invoke("upload-anexo-spaces", {
            body: formData,
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          });

          if (response.error) throw response.error;
          if (response.data?.anexo?.url_arquivo) {
            urlsAnexos.push(response.data.anexo.url_arquivo);
          }
        }

        // Adicionar URLs dos anexos à mensagem
        if (urlsAnexos.length > 0) {
          conteudoMensagem += `\n\n📎 Anexos enviados:\n${urlsAnexos.map((url, i) => `${i + 1}. ${url}`).join("\n")}`;
        }

        setAnexosSelecionados([]);
        toast.success(`${urlsAnexos.length} arquivo(s) enviado(s)`);
      } catch (error: any) {
        console.error("Erro ao fazer upload:", error);
        toast.error("Erro ao enviar anexos");
        setUploadando(false);
        return;
      } finally {
        setUploadando(false);
      }
    }

    const novasMensagens = [...mensagens, { role: "user" as const, content: conteudoMensagem }];
    setMensagens(novasMensagens);
    setEnviando(true);

    try {
      const response = await supabase.functions.invoke("chat-assistente-criacao", {
        body: {
          messages: novasMensagens,
          contexto: contextoInicial,
        },
      });

      if (response.error) throw response.error;

      const { message, sugestoes, perguntas_respondidas, perguntas_pendentes } = response.data;

      setMensagens((prev) => [...prev, { role: "assistant", content: message }]);

      if (perguntas_respondidas !== undefined) {
        setPerguntasRespondidas(perguntas_respondidas);
      }

      if (sugestoes && Object.keys(sugestoes).length > 0) {
        // Adicionar perguntas_pendentes se vier da API
        const sugestoesComPendentes = {
          ...sugestoes,
          perguntas_pendentes: perguntas_pendentes,
        };
        onSugestoesRecebidas(sugestoesComPendentes);
      }
    } catch (error: any) {
      console.error("Erro no chat:", error);
      toast.error("Erro ao processar mensagem");
      setMensagens((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, tive um problema. Pode repetir?",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const qualidadeDescricao = Math.min(100, perguntasRespondidas * 20);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Assistente IA</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {perguntasRespondidas} respondidas
            </Badge>
            {qualidadeDescricao >= 80 && (
              <Badge variant="default" className="bg-green-600">
                Pronto!
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>Sou uma enfermeira IA que posso te ajudar na crição so pós-venda!</CardDescription>
        <CardDescription>Qualidade da descrição: {qualidadeDescricao}%</CardDescription>
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${qualidadeDescricao}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {mensagens.map((msg, idx) => {
              // Extrair URLs de imagens da mensagem
              const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
              const imagensUrls = msg.content.match(urlRegex) || [];
              const textoSemUrls = msg.content
                .replace(urlRegex, "")
                .replace(/📎 Anexos enviados:\s*/g, "")
                .replace(/\d+\.\s*/g, "")
                .trim();

              return (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[85%] ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {textoSemUrls && <p className="text-sm whitespace-pre-wrap mb-2">{textoSemUrls}</p>}
                    {imagensUrls.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {imagensUrls.map((url, imgIdx) => (
                          <div key={imgIdx} className="relative rounded-lg overflow-hidden border border-border">
                            <img
                              src={url}
                              alt={`Anexo ${imgIdx + 1}`}
                              className="max-w-full h-auto max-h-64 object-contain bg-background"
                              onError={(e) => {
                                // Fallback se imagem não carregar
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {enviando && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {anexosSelecionados.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {anexosSelecionados.map((file, index) => (
              <Badge key={index} variant="secondary" className="gap-2 pr-1">
                <ImageIcon className="h-3 w-3" />
                <span className="text-xs">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={() => removerAnexo(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviando || uploadando}
              className="h-[60px] w-[60px] shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={inputMensagem}
              onChange={(e) => setInputMensagem(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua resposta ou anexe fotos..."
              className="min-h-[60px] resize-none"
              disabled={enviando || uploadando}
            />
            <Button
              onClick={enviarMensagem}
              disabled={enviando || uploadando || (!inputMensagem.trim() && anexosSelecionados.length === 0)}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              {uploadando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {sugestoesIA &&
            (!sugestoesIA.perguntas_pendentes || sugestoesIA.perguntas_pendentes.length === 0) &&
            onCriarTicket && (
              <Button onClick={onCriarTicket} disabled={isCriandoTicket || isClassificando} className="w-full h-[50px]">
                {isClassificando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Classificando com IA...
                  </>
                ) : isCriandoTicket ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando Ticket...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Criar Ticket
                  </>
                )}
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
