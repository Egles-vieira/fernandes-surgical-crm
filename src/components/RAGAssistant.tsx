import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  Send,
  Trash2,
  Bot,
  AlertCircle,
  User,
  Sparkles,
  X,
} from "lucide-react";
import { useRAGAssistant } from "@/hooks/useRAGAssistant";
import { cn } from "@/lib/utils";

interface RAGAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RAGAssistant = ({ open, onOpenChange }: RAGAssistantProps) => {
  const {
    messages,
    isLoading,
    error,
    isConnected,
    sendMessage,
    clearChat,
    retry,
  } = useRAGAssistant();
  
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus no input ao abrir
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleClearChat = () => {
    if (
      messages.length > 0 &&
      confirm("Deseja realmente limpar toda a conversa?")
    ) {
      clearChat();
    }
  };

  // Sugestões iniciais
  const suggestions = [
    "Qual foi o faturamento este mês?",
    "Quantos clientes novos foram cadastrados?",
    "Mostre os produtos mais vendidos",
    "Como está o desempenho da equipe?",
  ];

  if (!open) return null;

  return (
    <div className="fixed top-16 bottom-0 right-0 w-full sm:w-[600px] bg-background border-l shadow-2xl z-40 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="px-6 py-4 border-b space-y-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Assistente Inteligente</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className={cn(
                "text-xs",
                isConnected
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
              )}
            >
              {isConnected ? "Online" : "Offline"}
            </Badge>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={isLoading}
                aria-label="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Faça perguntas sobre seus dados e receba insights inteligentes
        </p>
      </div>

      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Olá! Como posso ajudar?
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Faça perguntas sobre seus dados. Posso analisar vendas, clientes,
                  produtos, equipes e muito mais.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4"
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                      <span className="text-sm">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-fade-in",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "rounded-lg px-4 py-3 max-w-[85%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : message.error
                        ? "bg-destructive/10 border border-destructive/20 rounded-bl-none"
                        : "bg-muted rounded-bl-none"
                    )}
                  >
                    {message.role === "assistant" && !message.error ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content || "..."}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                    
                    {message.error && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={retry}
                          className="text-xs"
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "text-xs mt-2 opacity-60",
                        message.role === "user"
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Analisando seus dados...
                    </span>
                  </div>
                </div>
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Input de Mensagem */}
      <div className="p-4 border-t flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte algo sobre seus dados..."
              disabled={isLoading}
              maxLength={500}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              size="icon"
              aria-label="Enviar mensagem"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {inputValue.length}/500 caracteres
            </span>
            {error && (
              <span className="text-xs text-destructive">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {error}
              </span>
            )}
        </div>
      </div>
    </div>
  );
};
