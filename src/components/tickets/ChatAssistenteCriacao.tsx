import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SugestaoIA {
  titulo_sugerido?: string;
  descricao_completa?: string;
  prioridade_sugerida?: 'baixa' | 'normal' | 'alta' | 'urgente';
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
}

export default function ChatAssistenteCriacao({ 
  contextoInicial, 
  onSugestoesRecebidas 
}: ChatAssistenteCriacaoProps) {
  const [mensagens, setMensagens] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Olá! Estou aqui para te ajudar a criar um ticket completo. Vou fazer algumas perguntas para entender melhor o problema. Pode começar me contando o que aconteceu?'
    }
  ]);
  const [inputMensagem, setInputMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [perguntasRespondidas, setPerguntasRespondidas] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const enviarMensagem = async () => {
    if (!inputMensagem.trim() || enviando) return;

    const mensagemUsuario = inputMensagem.trim();
    setInputMensagem('');
    
    const novasMensagens = [...mensagens, { role: 'user' as const, content: mensagemUsuario }];
    setMensagens(novasMensagens);
    setEnviando(true);

    try {
      const response = await supabase.functions.invoke('chat-assistente-criacao', {
        body: {
          messages: novasMensagens,
          contexto: contextoInicial
        }
      });

      if (response.error) throw response.error;

      const { message, sugestoes, perguntas_respondidas } = response.data;

      setMensagens(prev => [...prev, { role: 'assistant', content: message }]);
      
      if (perguntas_respondidas !== undefined) {
        setPerguntasRespondidas(perguntas_respondidas);
      }

      if (sugestoes && Object.keys(sugestoes).length > 0) {
        onSugestoesRecebidas(sugestoes);
      }
    } catch (error: any) {
      console.error('Erro no chat:', error);
      toast.error('Erro ao processar mensagem');
      setMensagens(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, tive um problema. Pode repetir?' 
      }]);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
        <CardDescription>
          Qualidade da descrição: {qualidadeDescricao}%
        </CardDescription>
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
            {mensagens.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={inputMensagem}
            onChange={(e) => setInputMensagem(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua resposta..."
            className="min-h-[60px] resize-none"
            disabled={enviando}
          />
          <Button
            onClick={enviarMensagem}
            disabled={enviando || !inputMensagem.trim()}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
