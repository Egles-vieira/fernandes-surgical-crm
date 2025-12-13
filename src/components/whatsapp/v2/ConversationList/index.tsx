// ============================================
// Conversation List Component
// ============================================

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Contato {
  id: string;
  nome_whatsapp: string;
  numero_whatsapp: string;
  foto_url?: string;
}

interface Conversa {
  id: string;
  status: string;
  origem_atendimento: string;
  criado_em: string;
  atualizado_em: string;
  ultima_mensagem?: string;
  whatsapp_contatos: Contato;
}

interface ConversationListProps {
  conversas: Conversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({ 
  conversas, 
  selectedId, 
  onSelect, 
  isLoading 
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredConversas = conversas.filter(conversa => {
    if (!searchTerm) return true;
    const nome = conversa.whatsapp_contatos?.nome_whatsapp?.toLowerCase() || '';
    const numero = conversa.whatsapp_contatos?.numero_whatsapp || '';
    return nome.includes(searchTerm.toLowerCase()) || numero.includes(searchTerm);
  });

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return <Badge variant="default" className="text-xs">Aberta</Badge>;
      case 'aguardando':
        return <Badge variant="secondary" className="text-xs">Aguardando</Badge>;
      case 'fechada':
        return <Badge variant="outline" className="text-xs">Fechada</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col border-r">
        <div className="p-3 border-b">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-r bg-card">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
            <Badge variant="secondary" className="text-xs">
              {conversas.length}
            </Badge>
          </h2>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={cn(
              "p-1.5 rounded-md hover:bg-muted transition-colors",
              showFavoritesOnly && "bg-primary/10 text-primary"
            )}
          >
            <Star className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversas.map(conversa => (
              <ConversationItem
                key={conversa.id}
                conversa={conversa}
                isSelected={conversa.id === selectedId}
                onSelect={() => onSelect(conversa.id)}
                getInitials={getInitials}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ConversationItem({
  conversa,
  isSelected,
  onSelect,
  getInitials,
  getStatusBadge,
}: {
  conversa: Conversa;
  isSelected: boolean;
  onSelect: () => void;
  getInitials: (nome: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const contato = conversa.whatsapp_contatos;
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all",
        "hover:bg-muted/50",
        isSelected && "bg-primary/10 border border-primary/20"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={contato?.foto_url} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(contato?.nome_whatsapp || '??')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">
            {contato?.nome_whatsapp || 'Desconhecido'}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(conversa.atualizado_em), { 
              addSuffix: false,
              locale: ptBR 
            })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {conversa.ultima_mensagem || contato?.numero_whatsapp}
          </span>
          {getStatusBadge(conversa.status)}
        </div>
      </div>
    </button>
  );
}
