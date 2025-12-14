// ============================================
// Message Reactions Component
// Exibe e gerencia reações em uma mensagem
// ============================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';

interface Reaction {
  emoji: string;
  count: number;
  hasUserReacted?: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  onRemoveReaction: () => void;
  isOutgoing?: boolean;
}

// Emojis comuns para reações rápidas
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageReactions({ 
  reactions, 
  onReact, 
  onRemoveReaction,
  isOutgoing = false 
}: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji && r.hasUserReacted);
    
    if (existingReaction) {
      // Remover reação
      onRemoveReaction();
    } else {
      // Adicionar reação
      onReact(emoji);
    }
    setIsOpen(false);
  };

  const hasReactions = reactions.length > 0;

  return (
    <div className={cn(
      "flex items-center gap-1 mt-1",
      isOutgoing ? "justify-end" : "justify-start"
    )}>
      {/* Reações existentes */}
      {hasReactions && (
        <div className="flex items-center gap-0.5 bg-muted/80 rounded-full px-1.5 py-0.5 shadow-sm">
          {reactions.map((reaction, index) => (
            <button
              key={index}
              onClick={() => handleReactionClick(reaction.emoji)}
              className={cn(
                "text-xs hover:scale-125 transition-transform cursor-pointer",
                reaction.hasUserReacted && "ring-1 ring-primary/50 rounded-full"
              )}
              title={reaction.hasUserReacted ? 'Clique para remover' : 'Clique para reagir'}
            >
              {reaction.emoji}
              {reaction.count > 1 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  {reaction.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Botão para adicionar reação */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity",
              hasReactions && "opacity-50"
            )}
          >
            <SmilePlus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2" 
          align={isOutgoing ? "end" : "start"}
          side="top"
        >
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => {
              const hasReacted = reactions.find(r => r.emoji === emoji)?.hasUserReacted;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={cn(
                    "text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-muted",
                    hasReacted && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                  title={hasReacted ? 'Remover reação' : `Reagir com ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
