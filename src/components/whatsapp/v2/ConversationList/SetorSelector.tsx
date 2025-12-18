// ============================================
// Seletor de Setor/Fila para filtrar conversas
// ============================================

import { ChevronDown, FolderOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Setor } from '@/hooks/useConversationFilters';

interface SetorSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  setores: Setor[];
  isLoading?: boolean;
}

export function SetorSelector({ 
  value, 
  onChange, 
  setores,
  isLoading 
}: SetorSelectorProps) {
  const selectedSetor = setores.find(s => s.id === value);
  const selectedLabel = selectedSetor?.nome || 'Setores';
  const selectedCor = selectedSetor?.cor || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs font-medium max-w-[150px]"
        >
          {selectedCor ? (
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedCor }}
            />
          ) : (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            value === null && "bg-primary/10"
          )}
        >
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Todos os Setores</span>
        </DropdownMenuItem>
        
        {setores.length > 0 && <DropdownMenuSeparator />}
        
        {isLoading ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            Carregando...
          </DropdownMenuItem>
        ) : setores.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            Nenhum setor encontrado
          </DropdownMenuItem>
        ) : (
          setores.map((setor) => (
            <DropdownMenuItem
              key={setor.id}
              onClick={() => onChange(setor.id)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                value === setor.id && "bg-primary/10"
              )}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: setor.cor || '#6B7280' }}
              />
              <span className="truncate">{setor.nome}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
