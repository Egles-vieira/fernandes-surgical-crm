// ============================================
// Toolbar de Filtros para Lista de Conversas
// ============================================

import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CaixaFilaSelector } from './CaixaFilaSelector';
import { SetorSelector } from './SetorSelector';
import { CanalContaSelector } from './CanalContaSelector';
import { OrdenacaoSelector } from './OrdenacaoSelector';
import { OperatorStatusDropdown } from './OperatorStatusDropdown';
import { useWhatsAppContext } from '@/contexts/WhatsAppContext';
import type { 
  CaixaTipo, 
  OrdenacaoTipo, 
  Contadores, 
  Setor, 
  Conta 
} from '@/hooks/useConversationFilters';

interface ConversationFiltersProps {
  // Filtros
  caixa: CaixaTipo;
  setorId: string | null;
  canalTipo: string;
  contaId: string | null;
  searchTerm: string;
  ordenacao: OrdenacaoTipo;
  
  // Setters
  onCaixaChange: (value: CaixaTipo) => void;
  onSetorChange: (value: string | null) => void;
  onCanalChange: (value: string) => void;
  onContaChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onOrdenacaoChange: (value: OrdenacaoTipo) => void;
  
  // Dados
  contadores: Contadores | null;
  setores: Setor[];
  contas: Conta[];
  
  // Loading states
  isLoadingContadores?: boolean;
  isLoadingSetores?: boolean;
  isLoadingContas?: boolean;
}

export function ConversationFilters({
  caixa,
  setorId,
  canalTipo,
  contaId,
  searchTerm,
  ordenacao,
  onCaixaChange,
  onSetorChange,
  onCanalChange,
  onContaChange,
  onSearchChange,
  onOrdenacaoChange,
  contadores,
  setores,
  contas,
  isLoadingContadores,
  isLoadingSetores,
  isLoadingContas,
}: ConversationFiltersProps) {
  const { statusAtual, changeStatus, isChangingStatus, totalNaoLidas } = useWhatsAppContext();

  return (
    <div className="space-y-2 p-3 border-b bg-card">
      {/* Linha 1: Caixa/Fila + Badge notificações */}
      <div className="flex items-center gap-2">
        <CaixaFilaSelector
          value={caixa}
          onChange={onCaixaChange}
          contadores={contadores}
          isLoading={isLoadingContadores}
        />
        
        <div className="flex-1" />
        
        {totalNaoLidas > 0 && (
          <div className="relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] font-bold"
            >
              {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
            </Badge>
          </div>
        )}
      </div>

      {/* Linha 2: Status + Setor + Canal/Conta + Busca */}
      <div className="flex items-center gap-2">
        <OperatorStatusDropdown
          status={statusAtual}
          onChange={changeStatus}
          isChanging={isChangingStatus}
        />
        
        <SetorSelector
          value={setorId}
          onChange={onSetorChange}
          setores={setores}
          isLoading={isLoadingSetores}
        />
        
        <CanalContaSelector
          canalTipo={canalTipo}
          contaId={contaId}
          onCanalChange={onCanalChange}
          onContaChange={onContaChange}
          contas={contas}
          isLoading={isLoadingContas}
        />
        
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Linha 3: Ordenação */}
      <div className="flex items-center justify-end">
        <OrdenacaoSelector
          value={ordenacao}
          onChange={onOrdenacaoChange}
        />
      </div>
    </div>
  );
}
