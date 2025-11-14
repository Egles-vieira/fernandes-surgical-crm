import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ContextoAtual {
  tipo: string;
  id: string;
}

export const useRAGAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const location = useLocation();

  const getContextoAtual = useCallback((): ContextoAtual | null => {
    const path = location.pathname;
    
    // Extrair ID da URL se existir
    const patterns = [
      { regex: /\/clientes\/([^\/]+)/, tipo: "cliente" },
      { regex: /\/vendas\/([^\/]+)/, tipo: "venda" },
      { regex: /\/produtos\/([^\/]+)/, tipo: "produto" },
      { regex: /\/tickets\/([^\/]+)/, tipo: "ticket" },
      { regex: /\/equipes\/([^\/]+)/, tipo: "equipe" },
    ];

    for (const pattern of patterns) {
      const match = path.match(pattern.regex);
      if (match) {
        return { tipo: pattern.tipo, id: match[1] };
      }
    }

    return null;
  }, [location.pathname]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        return;
      }

      // Adicionar mensagem do usuário
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Preparar contexto
      const contexto = getContextoAtual();
      const perguntaEnriquecida = contexto
        ? `[Contexto: usuário está visualizando ${contexto.tipo} ${contexto.id}]\n${content}`
        : content;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-assistant`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: [...messages, userMessage].map((m) => ({
                role: m.role,
                content: m.content,
              })),
              pergunta: perguntaEnriquecida,
            }),
          }
        );

        if (!response.ok) {
          let errorMessage = "Erro ao processar sua pergunta";

          if (response.status === 429) {
            errorMessage =
              "Muitas requisições. Por favor, aguarde um momento.";
          } else if (response.status === 402) {
            errorMessage =
              "Limite de uso atingido. Verifique seu plano Lovable.";
          } else if (response.status === 500) {
            errorMessage = "Erro no servidor. Tente novamente em instantes.";
          }

          throw new Error(errorMessage);
        }

        // Processar streaming SSE
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Não foi possível iniciar o streaming");
        }

        const decoder = new TextDecoder();
        let assistantMessageId = crypto.randomUUID();
        let assistantContent = "";

        // Adicionar mensagem vazia do assistente
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              
              if (data === "[DONE]") {
                setIsLoading(false);
                return;
              }

              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    assistantContent += content;
                    
                    // Atualizar mensagem do assistente incrementalmente
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      
                      if (lastMessage && lastMessage.id === assistantMessageId) {
                        lastMessage.content = assistantContent;
                      }
                      
                      return newMessages;
                    });
                  }
                } catch (e) {
                  // Ignorar erros de parsing de chunks incompletos
                  console.debug("Chunk parsing error (normal):", e);
                }
              }
            }
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        
        setError(errorMessage);
        setIsConnected(false);
        
        // Adicionar mensagem de erro
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: errorMessage,
            timestamp: new Date(),
            error: true,
          },
        ]);
        
        toast.error("Erro no Assistente", {
          description: errorMessage,
        });
        
        setIsLoading(false);
        
        // Reconectar após 3 segundos
        setTimeout(() => setIsConnected(true), 3000);
      }
    },
    [messages, getContextoAtual]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    toast.success("Conversa limpa");
  }, []);

  const retry = useCallback(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    
    if (lastUserMessage) {
      // Remover última mensagem de erro
      setMessages((prev) => prev.filter((m) => !m.error));
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    isConnected,
    sendMessage,
    clearChat,
    retry,
  };
};
