// ============================================
// Reply Preview Component
// Mostra a mensagem sendo respondida acima do input
// ============================================

import { X, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReplyPreviewProps {
  message: {
    id: string;
    corpo: string;
    direcao: 'enviada' | 'recebida';
    nome_remetente?: string;
  };
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  const isOutgoing = message.direcao === 'enviada';
  const senderName = isOutgoing ? 'Você' : (message.nome_remetente || 'Cliente');
  
  // Truncate message body
  const truncatedBody = message.corpo.length > 80 
    ? message.corpo.substring(0, 80) + '...' 
    : message.corpo;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-l-4 border-primary rounded-r-lg">
      <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-medium truncate",
          isOutgoing ? "text-primary" : "text-foreground"
        )}>
          {senderName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {truncatedBody}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
