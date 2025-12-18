// ============================================
// Seletor de Caixa/Fila para conversas
// ============================================

import { ChevronDown, Inbox, MessageCircle, Clock, Bot, Users, List } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CaixaTipo, Contadores } from '@/hooks/useConversationFilters';

interface CaixaFilaSelectorProps {
  value: CaixaTipo;
  onChange: (value: CaixaTipo) => void;
  contadores: Contadores | null;
  isLoading?: boolean;
}

interface CaixaOption {
  value: CaixaTipo;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  contadorKey: keyof Contadores;
}

const caixaOptions: CaixaOption[] = [
  { value: 'meus_atendimentos', label: 'Meus Atendimentos', icon: Inbox, contadorKey: 'meus_atendimentos' },
  { value: 'nao_lidas', label: 'Mensagens não Lidas', icon: MessageCircle, contadorKey: 'nao_lidas' },
  { value: 'fila_espera', label: 'Fila de Espera', icon: Clock, contadorKey: 'fila_espera' },
  { value: 'chatbot', label: 'ChatBot', icon: Bot, contadorKey: 'chatbot' },
  { value: 'operadores', label: 'Operadores', icon: Users, contadorKey: 'todos' },
];

const caixasSecundarias: CaixaOption[] = [
  { value: 'todos', label: 'Todos', icon: List, contadorKey: 'todos' },
  { value: 'todos_nao_lidas', label: 'Todos (não lidas)', icon: MessageCircle, contadorKey: 'todos_nao_lidas' },
];

export function CaixaFilaSelector({ 
  value, 
  onChange, 
  contadores,
  isLoading 
}: CaixaFilaSelectorProps) {
  const selectedOption = [...caixaOptions, ...caixasSecundarias].find(opt => opt.value === value);
  const SelectedIcon = selectedOption?.icon || Inbox;
  const selectedLabel = selectedOption?.label || 'Selecionar';
  const selectedContador = contadores && selectedOption 
    ? contadores[selectedOption.contadorKey] 
    : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs font-medium max-w-[150px]"
        >
          <SelectedIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
          {selectedContador > 0 && (
            <Badge 
              variant="secondary" 
              className="h-4 min-w-4 px-1 text-[10px] font-bold"
            >
              {selectedContador > 999 ? '999+' : selectedContador}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {caixaOptions.map((option) => {
          const Icon = option.icon;
          const contador = contadores ? contadores[option.contadorKey] : 0;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-between gap-2 cursor-pointer",
                value === option.value && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{option.label}</span>
              </div>
              {!isLoading && contador > 0 && (
                <Badge 
                  variant={option.value === 'nao_lidas' || option.value === 'fila_espera' 
                    ? 'destructive' 
                    : 'secondary'
                  }
                  className="h-5 min-w-5 px-1.5 text-xs font-bold"
                >
                  {contador > 9999 ? '9999+' : contador}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        {caixasSecundarias.map((option) => {
          const Icon = option.icon;
          const contador = contadores ? contadores[option.contadorKey] : 0;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-between gap-2 cursor-pointer",
                value === option.value && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{option.label}</span>
              </div>
              {!isLoading && contador > 0 && (
                <Badge 
                  variant="outline"
                  className="h-5 min-w-5 px-1.5 text-xs font-medium"
                >
                  {contador > 9999 ? '9999+' : contador}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
