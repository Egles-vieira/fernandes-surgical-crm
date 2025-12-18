// ============================================
// Seletor de Ordenação para lista de conversas
// ============================================

import { ArrowUpDown, ArrowDown, ArrowUp, MessageCircle, AlertCircle, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { OrdenacaoTipo } from '@/hooks/useConversationFilters';

interface OrdenacaoSelectorProps {
  value: OrdenacaoTipo;
  onChange: (value: OrdenacaoTipo) => void;
}

interface OrdenacaoOption {
  value: OrdenacaoTipo;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ordenacaoOptions: OrdenacaoOption[] = [
  { 
    value: 'mais_recente', 
    label: 'Mais recente', 
    icon: ArrowDown,
    description: 'Conversas com interação mais recente primeiro'
  },
  { 
    value: 'mais_antiga', 
    label: 'Mais antiga', 
    icon: ArrowUp,
    description: 'Conversas mais antigas primeiro'
  },
  { 
    value: 'nao_lidas_primeiro', 
    label: 'Não lidas primeiro', 
    icon: MessageCircle,
    description: 'Prioriza conversas com mensagens não lidas'
  },
  { 
    value: 'prioridade', 
    label: 'Por prioridade', 
    icon: AlertCircle,
    description: 'Ordena por nível de prioridade da conversa'
  },
];

export function OrdenacaoSelector({ value, onChange }: OrdenacaoSelectorProps) {
  const selectedOption = ordenacaoOptions.find(opt => opt.value === value);
  const selectedLabel = selectedOption?.label || 'Ordenar';

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDown className="h-3 w-3" />
            <span>{selectedLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {ordenacaoOptions.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  value === option.value && "bg-primary/10"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm">{option.label}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Info className="h-3 w-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-xs">
            {selectedOption?.description || 'Escolha como ordenar as conversas'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
