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
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contato?.foto_url} />
          <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium">
            {getInitials(contato?.nome_whatsapp || '??')}
          </AvatarFallback>
        </Avatar>
        {/* WhatsApp badge */}
        <div className="absolute -bottom-0.5 -right-0.5 bg-[#25D366] rounded-full p-0.5 border-2 border-card">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
      </div>

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
          <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-[#25D366] fill-current shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="truncate">{conversa.ultima_mensagem || contato?.numero_whatsapp}</span>
          </span>
          {getStatusBadge(conversa.status)}
        </div>
      </div>
    </button>
  );
}
