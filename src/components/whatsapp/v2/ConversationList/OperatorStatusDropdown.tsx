// ============================================
// Dropdown de Status do Operador
// ============================================

import { ChevronDown, Circle, Coffee, Moon, Wifi } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StatusAtendimento } from '@/hooks/useWhatsAppStatus';

interface OperatorStatusDropdownProps {
  status: StatusAtendimento;
  onChange: (status: StatusAtendimento) => Promise<void>;
  isChanging?: boolean;
}

interface StatusOption {
  value: StatusAtendimento;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
}

const statusOptions: StatusOption[] = [
  { 
    value: 'online', 
    label: 'Online', 
    icon: Wifi,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    description: 'Disponível para atendimentos'
  },
  { 
    value: 'ocupado', 
    label: 'Ocupado', 
    icon: Circle,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    description: 'Não receber novas conversas'
  },
  { 
    value: 'ausente', 
    label: 'Em Pausa', 
    icon: Coffee,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    description: 'Pausado temporariamente'
  },
  { 
    value: 'offline', 
    label: 'Offline', 
    icon: Moon,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
    description: 'Desconectado do atendimento'
  },
];

export function OperatorStatusDropdown({ 
  status, 
  onChange,
  isChanging 
}: OperatorStatusDropdownProps) {
  const selectedOption = statusOptions.find(opt => opt.value === status) || statusOptions[0];
  const SelectedIcon = selectedOption.icon;

  const handleStatusChange = async (newStatus: StatusAtendimento) => {
    if (newStatus === status || isChanging) return;
    await onChange(newStatus);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs font-medium"
          disabled={isChanging}
        >
          <span 
            className={cn(
              "w-2 h-2 rounded-full shrink-0 animate-pulse",
              selectedOption.bgColor
            )}
          />
          <span>{selectedOption.label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isChanging}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                status === option.value && "bg-primary/10"
              )}
            >
              <span 
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  option.bgColor
                )}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {option.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
